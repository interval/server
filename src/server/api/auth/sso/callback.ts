import type { Request, Response } from 'express'
import { Prisma, UserOrganizationInvitation } from '@prisma/client'
import prisma from '~/server/prisma'
import env from 'env'
import { workos, isWorkOSEnabled } from '.'
import { createUserSession, requiredIdentityConfirmation } from '~/server/auth'
import { generateSlug, getCollisionSafeSlug } from '~/server/utils/slugs'
import { getDomain } from '~/utils/email'
import { createOrganization } from '~/server/utils/organizations'
import { isFlagEnabled } from '~/server/utils/featureFlags'
import { logger } from '~/server/utils/logger'

export default async function callback(req: Request, res: Response) {
  if (!isWorkOSEnabled || !workos || !env.WORKOS_CLIENT_ID) {
    logger.error('WorkOS credentials not found, aborting', {
      path: req.path,
    })
    return res.sendStatus(501)
  }

  const { code, state } = req.query

  if (typeof code !== 'string') {
    res.status(400).end()
    return
  }

  const { profile, access_token } = await workos.sso.getProfileAndToken({
    code,
    clientID: env.WORKOS_CLIENT_ID,
  })

  const data: Prisma.UserCreateInput = {
    idpId: profile.idp_id,
    email: profile.email,
    firstName: profile.first_name,
    lastName: profile.last_name,
  }

  let invitationId: string | null = null
  let transactionId: string | null = null
  let intendedPlanName: string | null = null

  try {
    if (state) {
      const parsedState = JSON.parse(String(state))

      if (parsedState.invitationId) {
        invitationId = parsedState.invitationId
      }

      if (parsedState.transactionId) {
        transactionId = parsedState.transactionId
      }

      if (parsedState.plan) {
        intendedPlanName = parsedState.plan
      }
    }
  } catch (error) {
    /* no token in state */
  }

  if (transactionId) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        owner: true,
        action: {
          include: {
            organizationEnvironment: true,
            organization: true,
          },
        },
      },
    })

    if (!transaction || transaction.owner.email !== data.email) {
      res.redirect(
        `/authentication-not-confirmed?confirmError=${encodeURIComponent(
          !transaction ? 'transaction-not-found' : 'wrong-user'
        )}`
      )
      return
    }
  }

  let isNewUser = false

  let u:
    | Prisma.UserGetPayload<{
        select: {
          id: true
          lastName: true
          firstName: true
          email: true
          mfaId: true
          deletedAt: true
          userOrganizationAccess: {
            select: {
              organization: true
            }
            orderBy: {
              lastSwitchedToAt: 'desc'
            }
            take: 1
          }
        }
      }>
    | undefined = undefined

  try {
    // Check for existing idpId first
    u = await prisma.user.update({
      where: {
        idpId: profile.idp_id,
      },
      data,
      select: {
        id: true,
        lastName: true,
        firstName: true,
        email: true,
        mfaId: true,
        deletedAt: true,
        userOrganizationAccess: {
          select: {
            organization: true,
          },
          orderBy: {
            lastSwitchedToAt: 'desc',
          },
          take: 1,
        },
      },
    })
  } catch (err) {
    // Didn't exist
  }

  if (!u) {
    // If no idpId, check for existing email
    try {
      u = await prisma.user.update({
        where: {
          email: profile.email,
        },
        data,
        // select redeclared inline here for static typing
        select: {
          id: true,
          lastName: true,
          firstName: true,
          email: true,
          mfaId: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          userOrganizationAccess: {
            select: {
              organization: true,
            },
            orderBy: {
              lastSwitchedToAt: 'desc',
            },
            take: 1,
          },
        },
      })
    } catch (err) {
      // Doesn't exist, no problem
    }
  }

  if (u && u.deletedAt) {
    logger.info('Refusing SSO signin with disabled account', {
      userId: u.id,
      email: u.email,
      deletedAt: u.deletedAt,
    })

    return res.redirect('/signup?ACCOUNT_DISABLED')
  }

  if (!u) {
    if (!(await isFlagEnabled('USER_REGISTRATION_ENABLED'))) {
      const create = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
      }
      await prisma.userWaitlistEntry.upsert({
        create,
        update: create,
        where: {
          email: data.email,
        },
      })
      return res.redirect('/signup?REGISTRATION_DISABLED')
    }

    // Create if doesn't exist
    u = await prisma.user.create({
      data,
      // select redeclared inline here for static typing
      select: {
        id: true,
        lastName: true,
        firstName: true,
        email: true,
        mfaId: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        userOrganizationAccess: {
          select: {
            organization: true,
          },
          orderBy: {
            lastSwitchedToAt: 'desc',
          },
          take: 1,
        },
      },
    })

    await prisma.userOutreachStatus.create({
      data: {
        user: { connect: { id: u.id } },
      },
    })

    isNewUser = true
  }

  const { userOrganizationAccess, ...user } = u

  let sso:
    | Prisma.OrganizationSSOGetPayload<{
        include: {
          organization: true
        }
      }>
    | undefined
    | null
  if (profile.organization_id) {
    sso = await prisma.organizationSSO.findUnique({
      where: {
        workosOrganizationId: profile.organization_id,
      },
      include: {
        organization: true,
      },
    })
  }

  let orgSlug: string

  if (sso) {
    let access = await prisma.userOrganizationAccess.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: sso.organization.id,
        },
      },
    })

    if (!access) {
      access = await prisma.userOrganizationAccess.create({
        data: {
          user: { connect: { id: user.id } },
          organization: { connect: { id: sso.organization.id } },
          permissions: sso.defaultUserPermissions,
        },
      })
    }

    orgSlug = sso.organization.slug
  } else if (userOrganizationAccess.length) {
    orgSlug = userOrganizationAccess[0].organization.slug
  } else {
    const domain = getDomain(user.email)

    if (!domain) {
      // Shouldn't actually happen, email format already validated
      res.status(500).end()
      return
    }

    const sso = await prisma.organizationSSO.findFirst({
      where: {
        domain,
      },
    })

    let invitation: UserOrganizationInvitation | null = null
    if (invitationId) {
      invitation = await prisma.userOrganizationInvitation.findFirst({
        where: { id: String(invitationId), email: user.email },
      })
    }

    if (sso) {
      const access = await prisma.userOrganizationAccess.create({
        data: {
          permissions: sso.defaultUserPermissions,
          user: { connect: { id: user.id } },
          organization: { connect: { id: sso.organizationId } },
        },
        include: {
          organization: true,
        },
      })

      orgSlug = access.organization.slug
    } else if (invitation) {
      const access = await prisma.userOrganizationAccess.create({
        data: {
          permissions: invitation.permissions,
          user: { connect: { id: user.id } },
          organization: { connect: { id: invitation.organizationId } },
        },
        include: {
          organization: true,
        },
      })
      orgSlug = access.organization.slug
    } else {
      const desiredSlug = generateSlug(`${user.firstName} ${user.lastName}`)

      const existingSlugs = (
        await prisma.organization.findMany({
          where: {
            slug: {
              startsWith: desiredSlug,
            },
          },
          select: {
            slug: true,
          },
        })
      ).map(org => org.slug)

      const slug = getCollisionSafeSlug(desiredSlug, existingSlugs)

      await createOrganization({
        name: `${user.firstName}'s organization`,
        slug,
        ownerId: user.id,
        intendedPlanName,
      })

      orgSlug = slug
    }
  }

  const session = await createUserSession(user, {
    ssoAccessToken: access_token,
  })

  req.session.user = user
  req.session.session = session
  await req.session.save()

  if (user) {
    const fullUser = await prisma.user.findUnique({
      where: { email: user.email },
    })

    const requiredConfirmation = fullUser
      ? await requiredIdentityConfirmation(fullUser)
      : null
    const identityConfirmed =
      (sso && requiredConfirmation === 'SSO') ||
      (!sso && requiredConfirmation === 'LOGIN_WITH_GOOGLE')

    if (identityConfirmed) {
      try {
        const now = new Date()
        await prisma.userSession.update({
          where: { id: session.id },
          data: { identityConfirmedAt: now },
        })
        if (transactionId) {
          await prisma.transactionRequirement.updateMany({
            where: { transactionId, type: 'IDENTITY_CONFIRM' },
            data: { satisfiedAt: now },
          })
        }
      } catch (err) {
        console.log('SSO CALLBACK: Unable to confirm identity')
      }
    }
  }

  if (isNewUser) {
    res.redirect(`/confirm-signup/${orgSlug}`)
  } else if (transactionId) {
    res.redirect('/authentication-confirmed')
  } else {
    res.redirect(`/dashboard/${orgSlug}`)
  }
}
