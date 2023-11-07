import type {
  Prisma,
  UserAccessPermission,
  OrganizationPromoCode,
  UserOrganizationAccess,
  UserOrganizationInvitation,
} from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { encryptPassword } from './auth'
import { isFlagEnabled } from './utils/featureFlags'
import { createOrganization } from './utils/organizations'
import prisma from './prisma'
import { examples } from '~/utils/examples'
import { ReferralInfo } from '~/utils/referralSchema'
import { generateSlug, getCollisionSafeSlug } from './utils/slugs'
import { logger } from '~/server/utils/logger'

const availableTemplates = examples.map(item => item.id)

export async function createUser({
  data,
  password,
  organization,
  onboardingExampleSlug,
  referralInfo,
  intendedPlanName,
  invitation,
}: {
  data: Omit<Prisma.UserCreateInput, 'password'>
  password: string | null
  organization?: {
    new?: {
      name?: string
      promoCode: OrganizationPromoCode | null
    }
    existing?: {
      id: string
      permissions: UserAccessPermission[]
    }
  }
  onboardingExampleSlug?: string
  referralInfo?: ReferralInfo
  intendedPlanName?: string
  invitation?: UserOrganizationInvitation | null
}): Promise<
  Prisma.UserGetPayload<{
    select: {
      id: true
      lastName: true
      firstName: true
      email: true
      mfaId: true
      organizations: {
        include: {
          environments: true
        }
      }
    }
  }>
> {
  if (!(await isFlagEnabled('USER_REGISTRATION_ENABLED'))) {
    const create = {
      ...data,
      organizationName: organization?.new?.name,
    }

    await prisma.userWaitlistEntry.upsert({
      create,
      update: create,
      where: {
        email: data.email,
      },
    })
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'New user registration is currently disabled.',
    })
  }

  let user: Prisma.UserGetPayload<{
    select: {
      id: true
      lastName: true
      firstName: true
      email: true
    }
  }>

  try {
    user = await prisma.user.create({
      data: {
        ...data,
        password: password ? encryptPassword(password) : null,
      },
      select: {
        id: true,
        lastName: true,
        firstName: true,
        email: true,
      },
    })
  } catch (err) {
    logger.error('Failed creating account', { email: data.email, error: err })
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'An account already exists with that email.',
    })
  }

  let userOrganizationAccess: Prisma.UserOrganizationAccessCreateWithoutUserInput

  if (organization?.existing) {
    userOrganizationAccess = {
      organization: { connect: { id: organization.existing.id } },
      permissions: organization.existing.permissions,
    }
  } else {
    let slugBasis: string
    let orgName: string

    if (organization?.new?.name) {
      slugBasis = organization?.new?.name
      orgName = organization?.new?.name
    } else if (data.firstName || data.lastName) {
      slugBasis = `${data.firstName} ${data.lastName}`.trim()
      orgName = `${data.firstName}'s organization`
    } else {
      // _very_ unlikely (you must provide one of the above to sign up).
      // throwing an error at this point would be tricky (user is already created).
      // in the event you somehow get here, assign a random 9-digit number as your org slug.
      slugBasis = Math.floor(100000000 + Math.random() * 900000000).toString()
      orgName = 'My organization'
    }

    const desiredSlug = generateSlug(slugBasis)

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

    const newOrg = await createOrganization({
      name: orgName,
      promoCode: organization?.new?.promoCode || undefined,
      slug,
      ownerId: user.id,
      // We create it separately below
      createAccess: false,
      intendedPlanName,
    })

    userOrganizationAccess = {
      organization: { connect: { id: newOrg.id } },
      onboardingExampleSlug:
        onboardingExampleSlug &&
        availableTemplates.includes(onboardingExampleSlug)
          ? onboardingExampleSlug
          : undefined,
      permissions: ['ADMIN'],
    }
  }

  const access = await prisma.userOrganizationAccess.create({
    data: {
      ...userOrganizationAccess,
      user: { connect: { id: user.id } },
    },
    include: {
      organization: true,
      user: {
        select: {
          id: true,
          lastName: true,
          firstName: true,
          email: true,
          mfaId: true,
          organizations: {
            include: {
              environments: true,
            },
          },
        },
      },
    },
  })

  if (invitation) {
    await processInvitationGroupIds(invitation, access)
  }

  await prisma.userOutreachStatus.create({
    data: {
      user: { connect: { id: user.id } },
    },
  })

  // delete any open invitations for this user x organization
  await prisma.userOrganizationInvitation.deleteMany({
    where: {
      email: user.email,
      organizationId: access.organizationId,
    },
  })

  if (referralInfo && Object.values(referralInfo).some(val => val != null)) {
    await prisma.userReferralInfo.create({
      data: {
        user: { connect: { id: user.id } },
        ...referralInfo,
      },
    })
  }

  return access.user
}

export async function processInvitationGroupIds(
  invitation: UserOrganizationInvitation,
  access: Pick<UserOrganizationAccess, 'id' | 'userId'>
) {
  if (Array.isArray(invitation.groupIds)) {
    for (const groupId of invitation.groupIds) {
      try {
        await prisma.userAccessGroupMembership.create({
          data: {
            userOrganizationAccess: { connect: { id: access.id } },
            group: { connect: { id: String(groupId) } },
          },
        })
      } catch (error) {
        logger.error('Failed to add invited user to group', {
          userId: access.userId,
          groupId,
        })
      }
    }
  }
}
