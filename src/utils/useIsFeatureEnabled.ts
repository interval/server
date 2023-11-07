import { ConfiguredFeatureFlag } from '@prisma/client'
import {
  useDashboardOptional,
  useOrganizationOptional,
} from '~/components/DashboardContext'
import { isFeatureFlagEnabled } from './featureFlags'
import { trpc } from './trpc'

export function useIsFeatureEnabled(flag: ConfiguredFeatureFlag) {
  const dashboard = useDashboardOptional()
  const organization = useOrganizationOptional()
  const globalFeatureFlags = trpc.useQuery(['dashboard.global-feature-flags'], {
    enabled: !dashboard,
  })

  return isFeatureFlagEnabled(flag, {
    globalFeatureFlags:
      dashboard?.globalFeatureFlags ?? globalFeatureFlags.data,
    organization,
  })
}
