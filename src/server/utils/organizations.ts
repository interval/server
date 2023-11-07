import prisma from '../prisma'
import type { OrganizationPromoCode } from '@prisma/client'
import { dashboardL1Paths } from '~/server/utils/routes'
import { isOrgSlugValid } from '~/utils/validate'
import { TRPCError } from '@trpc/server'
import {
  DEVELOPMENT_ORG_ENV_NAME,
  DEVELOPMENT_ORG_ENV_SLUG,
  PRODUCTION_ORG_ENV_NAME,
  PRODUCTION_ORG_ENV_SLUG,
} from '~/utils/environments'

export async function isSlugAvailable(
  slug: string,
  existingOrganizationId?: string
): Promise<boolean> {
  if (!isOrgSlugValid(slug)) return false

  if (dashboardL1Paths.has(slug)) return false

  const org = await prisma.organization.findFirst({
    where: {
      id: existingOrganizationId
        ? {
            not: existingOrganizationId,
          }
        : undefined,
      slug,
    },
  })

  return !org
}

export async function createOrganization({
  name,
  slug,
  ownerId,
  promoCode,
  createAccess = true,
}: {
  name: string
  slug: string
  ownerId: string
  promoCode?: OrganizationPromoCode | null
  intendedPlanName?: string | null
  createAccess?: boolean
}) {
  const organizationPromoCode = promoCode
    ? { connect: { code: promoCode.code } }
    : undefined
  const organization = await prisma.organization.create({
    data: {
      name,
      slug,
      organizationPromoCode,
      owner: { connect: { id: ownerId } },
      private: { create: {} },
      environments: {
        createMany: {
          data: [
            { name: PRODUCTION_ORG_ENV_NAME, slug: PRODUCTION_ORG_ENV_SLUG },
            { name: DEVELOPMENT_ORG_ENV_NAME, slug: DEVELOPMENT_ORG_ENV_SLUG },
          ],
        },
      },
      userOrganizationAccess: createAccess
        ? {
            create: {
              permissions: ['ADMIN'],
              user: { connect: { id: ownerId } },
            },
          }
        : undefined,
    },
  })

  return organization
}

export async function getOrganizationAccess(userId: string, orgSlug: string) {
  const access = await prisma.userOrganizationAccess.findFirst({
    where: {
      userId: userId,
      organization: { slug: orgSlug },
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

  return access
}
