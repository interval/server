import { ConfiguredFeatureFlag } from '@prisma/client'
import {
  isFeatureFlagEnabled,
  OrganizationWithFlags,
} from '~/utils/featureFlags'
import prisma from '../prisma'

export async function isFlagEnabled(
  flagToCheck: ConfiguredFeatureFlag,
  organizationId?: string
): Promise<boolean> {
  const globalFeatureFlags = await prisma.globalFeatureFlag.findMany({
    where: {
      enabled: true,
    },
  })

  let organization: OrganizationWithFlags | undefined | null

  if (organizationId) {
    organization = await prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
      include: {
        featureFlags: true,
      },
    })
  }

  return isFeatureFlagEnabled(flagToCheck, {
    globalFeatureFlags,
    organization,
  })
}
