import { TRPCError } from '@trpc/server'
import { hasPermission } from '~/utils/permissions'
import { generateKey, SessionUserData } from '~/server/auth'
import { UserOrganizationAccess } from '@prisma/client'
import prisma from '~/server/prisma'
import { DEVELOPMENT_ORG_ENV_SLUG } from '~/utils/environments'
import { logger } from '~/server/utils/logger'

export async function getDevKey({
  user,
  organizationId,
  userOrganizationAccess,
}: {
  user: SessionUserData
  organizationId: string
  userOrganizationAccess: UserOrganizationAccess
}) {
  let key = await prisma.apiKey.findFirst({
    where: {
      userId: user.id,
      organizationId,
      usageEnvironment: 'DEVELOPMENT',
      organizationEnvironment: { slug: DEVELOPMENT_ORG_ENV_SLUG },
      deletedAt: null,
    },
  })

  if (!key) {
    if (!hasPermission(userOrganizationAccess, 'CREATE_DEV_API_KEYS')) {
      throw new TRPCError({ code: 'FORBIDDEN' })
    }

    const orgEnv = await prisma.organizationEnvironment.findFirst({
      where: { slug: DEVELOPMENT_ORG_ENV_SLUG, organizationId },
    })

    if (!orgEnv) {
      logger.error('Development organization environment not found', {
        organizationId,
      })
      throw new TRPCError({ code: 'NOT_FOUND' })
    }

    key = await prisma.apiKey.create({
      data: {
        key: generateKey(user, 'DEVELOPMENT'),
        userId: user.id,
        organizationId: organizationId,
        usageEnvironment: 'DEVELOPMENT',
        organizationEnvironmentId: orgEnv.id,
      },
    })
  }

  return key
}
