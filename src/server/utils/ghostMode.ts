import { UserAccessPermission } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { DEVELOPMENT_ORG_ENV_SLUG } from '~/utils/environments'
import { hasPermission } from '~/utils/permissions'
import prisma from '../prisma'
import { Context } from '../trpc/util'

// manually specifying the minimum required to authorize
export async function authorizePotentialGhostRequest(
  ctx: Context,
  requiredPermission: UserAccessPermission
) {
  const {
    userOrganizationAccess,
    user,
    organizationId,
    organizationEnvironmentId,
    organizationEnvironment,
  } = ctx
  const userId = user?.id

  if (userOrganizationAccess) {
    if (!hasPermission(userOrganizationAccess, requiredPermission)) {
      throw new TRPCError({ code: 'FORBIDDEN' })
    }

    if (userId && organizationId && organizationEnvironmentId) {
      return {
        userId,
        organizationId,
        userOrganizationAccess,
        organizationEnvironmentId,
        organizationEnvironment,
      }
    }
  }

  // As a last resort, we should see if the org is a ghost org
  if (organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        environments: true,
      },
    })

    const orgEnv = org?.environments.find(
      env => env.slug === DEVELOPMENT_ORG_ENV_SLUG
    )

    if (!org || !org.isGhostMode || !orgEnv) {
      throw new TRPCError({ code: 'FORBIDDEN' })
    }

    return {
      organizationId: org.id,
      userId: org.ownerId,
      organizationEnvironmentId: orgEnv.id,
    }
  }

  throw new TRPCError({ code: 'UNAUTHORIZED' })
}
