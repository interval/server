import {
  Prisma,
  ConfiguredFeatureFlag,
  GlobalFeatureFlag,
} from '@prisma/client'

export const FEATURE_FLAG_DEFAULTS: Record<ConfiguredFeatureFlag, boolean> = {
  // Global behavior flags
  GHOST_MODE_ENABLED: false,
  USER_REGISTRATION_ENABLED: true,

  // User experience flags, can be enabled globally as well
  TRANSACTION_LEGACY_NO_APPEND_UI: false,
  ACTION_METADATA_GENERAL_CONFIG: false,
  TABLE_TRUNCATION_DISABLED: false,
}

/**
 * Affects individual/organization user experience, can be toggled independently.
 */
export const UX_FEATURE_FLAGS: readonly ConfiguredFeatureFlag[] = [
  'TRANSACTION_LEGACY_NO_APPEND_UI',
  'ACTION_METADATA_GENERAL_CONFIG',
  'TABLE_TRUNCATION_DISABLED',
] as const

export function isGlobalFeatureFlagEnabled(
  flag: ConfiguredFeatureFlag,
  globalFlags: GlobalFeatureFlag[]
): boolean | undefined {
  return globalFlags.find(f => f.flag === flag)?.enabled
}

export type OrganizationWithFlags = Prisma.OrganizationGetPayload<{
  select: {
    featureFlags: true
  }
}>

export function isFeatureFlagEnabledForOrganization(
  flag: ConfiguredFeatureFlag,
  // Only specifying the min required type since this function is isomorphic
  organization: OrganizationWithFlags
): boolean | undefined {
  return organization.featureFlags.find(f => f.flag === flag)?.enabled
}

export function isFeatureFlagEnabled(
  flag: ConfiguredFeatureFlag,
  {
    globalFeatureFlags,
    organization,
  }: {
    globalFeatureFlags: GlobalFeatureFlag[] | null | undefined
    organization: OrganizationWithFlags | null | undefined
  }
): boolean {
  const globalFlagEnabled = globalFeatureFlags
    ? isGlobalFeatureFlagEnabled(flag, globalFeatureFlags)
    : undefined
  const orgFlagEnabled = organization
    ? isFeatureFlagEnabledForOrganization(flag, organization)
    : undefined

  if (globalFlagEnabled) {
    return globalFlagEnabled
  }

  if (orgFlagEnabled) {
    return orgFlagEnabled
  }

  return FEATURE_FLAG_DEFAULTS[flag] ?? false
}
