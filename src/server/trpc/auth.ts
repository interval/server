import {
  Prisma,
  OrganizationSSO,
  UserAccessPermission,
  OrganizationPromoCode,
} from '@prisma/client'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { unsealData } from 'iron-session'
import { createRouter, authenticatedMiddleware } from './util'
import {
  challengeMfa,
  encryptPassword,
  enrollMfa,
  ironSessionOptions,
  verifyMfa,
  requiredIdentityConfirmation,
  defaultIdentityConfirmGracePeriod,
  createResetUrl,
  requestEmailConfirmation,
  isWorkOSEnabled,
} from '~/server/auth'
import { createUser } from '~/server/user'
import { forgotPassword } from '~/emails'
import { getDomain } from '~/utils/email'
import { getOrganizationAccess } from '../utils/organizations'
import { hasPermission } from '~/utils/permissions'
import { AuthenticationError } from '~/utils/auth'
import { referralInfoSchema } from '~/utils/referralSchema'
import { logger } from '~/server/utils/logger'

export const authRouter = createRouter()
  .query('session.user', {
    async resolve({ ctx: { req } }) {
      if (req?.session.user) {
        return {
          email: req?.session.user?.email,
          meId: req?.session.user?.id,
          orgId: req?.session.currentOrganizationId,
          orgEnvId: req?.session.currentOrganizaitonEnvironmentId,
        }
      }
    },
  })
  .query('session.session', {
    async resolve({ ctx: { req } }) {
      if (req?.session.session) {
        return {
          hasMfa: isWorkOSEnabled && !!req.session.session.mfaChallengeId,
          hasSso: isWorkOSEnabled && !!req.session.session.ssoAccessToken,
        }
      }
    },
  })
  .query('check', {
    input: z.object({
      email: z.string().email(),
      transactionId: z.string().optional(),
    }),
    async resolve({
      ctx: { prisma, session },
      input: { email, transactionId },
    }) {
      const domain = getDomain(email)

      if (!domain) {
        throw new TRPCError({ code: 'BAD_REQUEST' })
      }

      const user = await prisma.user.findUnique({
        where: {
          email,
        },
      })

      const needsMfa = !!user?.mfaId

      const sso = (await prisma.organizationSSO.findFirst({
        where: {
          domain,
          workosOrganizationId: {
            not: null,
          },
        },
      })) as
        | (OrganizationSSO & {
            workosOrganizationId: NonNullable<
              OrganizationSSO['workosOrganizationId']
            >
          })
        | null

      let gracePeriod = defaultIdentityConfirmGracePeriod

      if (transactionId) {
        const transaction = await prisma.transaction.findUnique({
          where: { id: transactionId },
          include: {
            requirements: {
              where: { satisfiedAt: null, canceledAt: null },
            },
          },
        })

        if (!transaction) {
          throw new TRPCError({ code: 'NOT_FOUND' })
        }

        if (
          transaction.requirements.length > 0 &&
          transaction.requirements[0].gracePeriodMs != null
        ) {
          gracePeriod = transaction.requirements[0].gracePeriodMs
        }
      }

      return {
        isWorkOSEnabled,
        sso,
        needsMfa,
        identityConfirmed:
          session?.identityConfirmedAt &&
          new Date().valueOf() -
            new Date(session?.identityConfirmedAt).valueOf() <
            gracePeriod,
      }
    },
  })
  .mutation('mfa.challenge', {
    async resolve({ ctx: { req } }) {
      // We use req.session.user instead of ctx.user because
      // the session won't be valid before the MFA verification
      const user = req?.session?.user
      if (!user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      const { mfaId } = user

      if (!mfaId) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const challenge = await challengeMfa(mfaId)

      return challenge.id
    },
  })
  .mutation('mfa.verify', {
    input: z.object({
      challengeId: z.string(),
      code: z.string(),
      transactionId: z.string().optional(),
    }),
    async resolve({
      ctx: { req, prisma, user, session: dbSession },
      input: { challengeId, code, transactionId },
    }) {
      // We use req.session.session instead of ctx.session because
      // the session won't be valid before the MFA verification
      const session = req?.session?.session

      if (!session) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      try {
        await verifyMfa(challengeId, code, session)

        if (user) {
          const fullUser = await prisma.user.findUnique({
            where: { email: user.email },
          })

          const requiredConfirmation = fullUser
            ? await requiredIdentityConfirmation(fullUser)
            : null
          if (requiredConfirmation === 'MFA') {
            try {
              const now = new Date()
              if (dbSession) {
                await prisma.userSession.update({
                  where: { id: dbSession.id },
                  data: { identityConfirmedAt: now },
                })
              }
              if (transactionId) {
                await prisma.transactionRequirement.updateMany({
                  where: { transactionId, type: 'IDENTITY_CONFIRM' },
                  data: { satisfiedAt: now },
                })
              }
            } catch (err) {
              // Transaction doesn't exist
              throw new TRPCError({
                code: 'BAD_REQUEST',
                cause: err,
              })
            }
          }
        }

        return true
      } catch (err) {
        throw new TRPCError({ code: 'BAD_REQUEST', cause: err })
      }
    },
  })
  .mutation('identity.confirm', {
    input: z.object({
      transactionId: z.string(),
    }),
    async resolve({ ctx: { prisma, session }, input: { transactionId } }) {
      if (!session) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      try {
        const transaction = await prisma.transaction.findUnique({
          where: { id: transactionId },
          include: {
            requirements: {
              where: { satisfiedAt: null, canceledAt: null },
            },
          },
        })

        if (!transaction) {
          throw new TRPCError({ code: 'NOT_FOUND' })
        }

        const gracePeriod =
          transaction.requirements.length > 0 &&
          transaction.requirements[0].gracePeriodMs != null
            ? transaction.requirements[0].gracePeriodMs
            : defaultIdentityConfirmGracePeriod

        if (
          session.identityConfirmedAt &&
          new Date().valueOf() -
            new Date(session.identityConfirmedAt).valueOf() <
            gracePeriod
        ) {
          const now = new Date()
          await prisma.transactionRequirement.updateMany({
            where: { transactionId, type: 'IDENTITY_CONFIRM' },
            data: { satisfiedAt: now },
          })
          return true
        } else {
          return false
        }
      } catch (err) {
        throw new TRPCError({ code: 'BAD_REQUEST', cause: err })
      }
    },
  })
  .query('signup.check', {
    input: z.object({
      invitationId: z.string().nullish(),
    }),
    async resolve({ ctx: { prisma, user }, input: { invitationId } }) {
      let isLoginRequired = false
      let isSignupRequired = false
      let invitation: Prisma.UserOrganizationInvitationGetPayload<{
        select: {
          id: true
          organizationId: true
          email: true
          organization: {
            select: { name: true }
          }
        }
      }> | null = null

      if (invitationId) {
        invitation = await prisma.userOrganizationInvitation.findUnique({
          where: { id: invitationId },
          select: {
            id: true,
            organizationId: true,
            email: true,
            organization: {
              select: { name: true },
            },
          },
        })

        if (!invitation) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid invitation link.',
          })
        }

        if (user && invitation.email !== user.email) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Sorry, this invitation is for another email address. You are logged in as ${user.email}.`,
          })
        }

        // if not logged in and invitation is intended for an existing user
        if (!user) {
          const existingUser = await prisma.user.findUnique({
            where: { email: invitation.email },
            select: { id: true },
          })

          if (existingUser) {
            isLoginRequired = true
          } else {
            isSignupRequired = true
          }
        }
      }

      return {
        invitation,
        isLoginRequired,
        isSignupRequired,
      }
    },
  })
  .mutation('signup.check-email', {
    input: z.object({
      email: z.string().email(),
    }),
    async resolve({ ctx: { prisma }, input: { email } }) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'An account already exists with that email.',
        })
      }

      return { email }
    },
  })
  .mutation('signup', {
    input: z.object({
      email: z.string().email(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      password: z.string(),

      organizationName: z.string().optional(),
      organizationPromoCode: z.string().optional(),
      invitationId: z.string().nullish(),
      timeZoneName: z.string().optional(),
      onboardingExampleSlug: z.string().optional(),
      intendedPlanName: z.string().optional(),

      referralInfo: referralInfoSchema,
    }),
    async resolve({ ctx: { prisma }, input }) {
      const {
        password,
        invitationId,
        organizationName,
        organizationPromoCode,
        onboardingExampleSlug,
        referralInfo,
        intendedPlanName,
        ...data
      } = input

      const invitation = invitationId
        ? await prisma.userOrganizationInvitation.findUnique({
            where: { id: invitationId },
          })
        : null

      if (invitationId && !invitation) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid invitation link',
        })
      }

      if (invitation && invitation.email !== input.email) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Sorry, this invitation is for another email address. You entered ${input.email}.`,
        })
      }

      let promoCode: OrganizationPromoCode | null = null
      if (organizationPromoCode) {
        promoCode = await prisma.organizationPromoCode.findFirst({
          where: {
            code: {
              equals: organizationPromoCode,
              mode: 'insensitive',
            },
          },
        })
        if (!promoCode) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid promo code',
          })
        }
      }

      let organization:
        | {
            new?: {
              name?: string
              promoCode: OrganizationPromoCode | null
            }
            existing?: {
              id: string
              permissions: UserAccessPermission[]
            }
          }
        | undefined

      if (invitation) {
        organization = {
          existing: {
            id: invitation.organizationId,
            permissions: invitation.permissions,
          },
        }
      } else {
        const domain = getDomain(data.email)

        if (!domain) {
          // Shouldn't actually happen, email format already validated
          throw new TRPCError({ code: 'BAD_REQUEST' })
        }

        const sso = await prisma.organizationSSO.findFirst({
          where: {
            domain,
          },
        })

        if (sso) {
          organization = {
            existing: {
              id: sso.organizationId,
              permissions: sso.defaultUserPermissions,
            },
          }
        } else if (organizationName || organizationPromoCode) {
          organization = {
            new: {
              name: organizationName,
              promoCode,
            },
          }
        }
      }

      const user = await createUser({
        data,
        password,
        organization,
        onboardingExampleSlug,
        referralInfo,
        intendedPlanName,
        invitation,
      })

      if (!invitation) {
        await requestEmailConfirmation(user)
      }

      return user
    },
  })
  .mutation('forgot-password', {
    input: z.object({
      email: z.string().email(),
    }),
    async resolve({ ctx: { prisma }, input: { email } }) {
      const user = await prisma.user.findUnique({
        where: {
          email,
        },
      })

      if (!user) {
        // We don't want to leak information about which email
        // addresses exist, so no error here
        return
      }

      if (isWorkOSEnabled && user.idpId) {
        // FIXME: May not need to leak this?
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User created via SSO',
        })
      }

      await prisma.userPasswordResetToken.deleteMany({
        where: {
          userId: user.id,
        },
      })

      const resetToken = await prisma.userPasswordResetToken.create({
        data: {
          user: { connect: { id: user.id } },
        },
      })

      const resetUrl = await createResetUrl(resetToken.id)

      forgotPassword(user.email, { resetUrl })
    },
  })
  // ********** Endpoints below here require authentication **********
  .middleware(authenticatedMiddleware)
  .mutation('mfa.enroll.start', {
    async resolve({ ctx: { user } }) {
      try {
        const enrollResponse = await enrollMfa(user)
        const challenge = await challengeMfa(enrollResponse.id)

        return {
          mfaId: enrollResponse.id,
          challengeId: challenge.id,
          qrCode: enrollResponse.totp.qr_code,
          secret: enrollResponse.totp.secret,
        }
      } catch (err) {
        logger.error('Failed enrolling MFA', { error: err })
        throw new TRPCError({ code: 'BAD_REQUEST', cause: err })
      }
    },
  })
  .mutation('mfa.enroll.complete', {
    input: z.object({
      challengeId: z.string(),
      code: z.string(),
    }),
    async resolve({
      ctx: { prisma, user, session },
      input: { challengeId, code },
    }) {
      try {
        const challenge = await verifyMfa(challengeId, code, session)

        await prisma.user.update({
          where: { id: user.id },
          data: { mfaId: challenge.mfaId },
        })
      } catch (err) {
        logger.error('Failed completing MFA enrollment', { error: err })
        throw new TRPCError({ code: 'BAD_REQUEST', cause: err })
      }
    },
  })
  .mutation('mfa.delete', {
    input: z.object({
      challengeId: z.string(),
      code: z.string(),
    }),
    async resolve({
      ctx: { prisma, user, session },
      input: { challengeId, code },
    }) {
      if (!user.mfaId) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      try {
        await verifyMfa(challengeId, code, session)

        await Promise.all([
          prisma.user.update({
            where: { id: user.id },
            data: { mfaId: null },
          }),
          prisma.userSession.update({
            where: { id: session.id },
            data: { mfaChallenge: { delete: true } },
          }),
        ])
      } catch (err) {
        const code =
          err instanceof AuthenticationError
            ? 'UNAUTHORIZED'
            : 'INTERNAL_SERVER_ERROR'

        throw new TRPCError({ code, cause: err })
      }
    },
  })
  .query('mfa.has', {
    async resolve({ ctx: { prisma, ...ctx } }) {
      const user = await prisma.user.findUnique({
        where: { id: ctx.user.id },
      })

      if (!user) {
        // this should never happen
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return isWorkOSEnabled && !!user?.mfaId
    },
  })
  .query('password.has', {
    async resolve({ ctx: { user, prisma } }) {
      const userWithPassword = await prisma.user.findFirst({
        where: {
          id: user.id,
          password: {
            not: null,
          },
        },
        select: {
          id: true,
        },
      })

      return userWithPassword != null
    },
  })
  .mutation('password.edit', {
    input: z.object({
      data: z.object({
        newPassword: z.string(),
        newPasswordConfirm: z.string(),
      }),
    }),
    async resolve({ ctx: { user, prisma }, input: { data } }) {
      if (data.newPassword !== data.newPasswordConfirm) {
        throw new Error('New passwords do not match')
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { password: encryptPassword(data.newPassword) },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      })

      return updatedUser
    },
  })
  .query('confirm-email', {
    input: z.object({
      token: z.string().nullish(),
    }),
    async resolve({ ctx: { user, prisma }, input: { token } }) {
      if (token) {
        const unsealed = await unsealData<{ confirmTokenId: string }>(token, {
          password: ironSessionOptions.password,
        })

        const pendingToken = await prisma.userEmailConfirmToken.findUnique({
          where: { id: unsealed.confirmTokenId },
        })

        if (!pendingToken) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message:
              'Sorry, this link has expired. Please log in again to request a new link.',
          })
        }

        if (pendingToken.userId !== user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message:
              'Sorry, this link is for a different account than the one you are logged into.',
          })
        }

        if (pendingToken.expiresAt < new Date()) {
          // automatically generate a new confirmation
          await requestEmailConfirmation(user)

          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              'Sorry, this link has expired. We sent a new link to your email address, please check your email and try again.',
          })
        }

        if (pendingToken.email) {
          await prisma.user.update({
            where: { id: pendingToken.userId },
            data: { email: pendingToken.email },
          })
        }

        await prisma.userEmailConfirmToken.delete({
          where: { id: unsealed.confirmTokenId },
        })

        return { isConfirmRequired: false }
      }

      const pendingToken = await prisma.userEmailConfirmToken.findUnique({
        where: { userId: user.id },
      })

      if (pendingToken && pendingToken.expiresAt < new Date()) {
        // token has expired; generate a new one
        // (this is so users don't land on the page that says "we sent an email" and we don't actually send an email)
        await requestEmailConfirmation(user)
      }

      return { isConfirmRequired: !!pendingToken }
    },
  })
  .mutation('confirm-email.refresh', {
    async resolve({ ctx: { user, prisma } }) {
      await prisma.userEmailConfirmToken.deleteMany({
        where: { userId: user.id },
      })

      await requestEmailConfirmation(user)

      return {}
    },
  })
  .query('confirm-sso.check', {
    input: z.object({
      orgSlug: z.string(),
    }),
    async resolve({ ctx: { user }, input }) {
      const access = await getOrganizationAccess(user.id, input.orgSlug)

      // only offer to rename if user is owner + name has not already been changed from the default
      const canRenameOrg =
        hasPermission(access, 'WRITE_ORG_SETTINGS') &&
        access.organization.name.endsWith("'s organization") &&
        access.organization.ownerId === user.id

      return {
        canRenameOrg,
        firstName: user.firstName,
        lastName: user.lastName,
        orgName: access.organization.name,
        orgId: access.organization.id,
      }
    },
  })
  .mutation('confirm-sso', {
    input: z.object({
      firstName: z.string(),
      lastName: z.string(),
      orgId: z.string(),
      orgSlug: z.string(),
      orgName: z.string().optional(),
      organizationPromoCode: z.string().optional(),
      referralInfo: referralInfoSchema,
    }),
    async resolve({ ctx: { user, prisma }, input }) {
      const {
        firstName,
        lastName,
        orgName,
        orgSlug,
        orgId,
        organizationPromoCode,
        referralInfo,
      } = input

      const access = await prisma.userOrganizationAccess.findUnique({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: orgId,
          },
        },
        include: {
          organization: true,
        },
      })

      if (!access) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this organization',
        })
      }

      let promoCode: OrganizationPromoCode | null = null

      if (organizationPromoCode) {
        promoCode = await prisma.organizationPromoCode.findFirst({
          where: {
            code: {
              equals: organizationPromoCode,
              mode: 'insensitive',
            },
          },
        })
        if (!promoCode) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid promo code',
          })
        }
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { firstName, lastName },
      })

      if (
        referralInfo &&
        Object.values(referralInfo).some(val => val != null)
      ) {
        await prisma.userReferralInfo.create({
          data: {
            user: { connect: { id: user.id } },
            ...referralInfo,
          },
        })
      }

      if (hasPermission(access, 'WRITE_ORG_SETTINGS') && (orgName || orgSlug)) {
        await prisma.organization.update({
          where: {
            id: access.organization.id,
          },
          data: {
            name: orgName,
            slug: orgSlug,
            organizationPromoCode: promoCode
              ? // reference db row to prevent case sensitivity mismatch
                { connect: { code: promoCode.code } }
              : undefined,
          },
        })
      }
    },
  })
