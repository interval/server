import { Organization } from '@prisma/client'
import useDashboard, {
  DashboardContextValue,
} from '~/components/DashboardContext'
import { useOrgParams } from './organization'
import { trpc } from './trpc'
import { logger } from '~/utils/logger'

export interface OrgSwitcherState {
  me: Omit<DashboardContextValue['me'], 'isEmailConfirmationRequired'>
  isMeLoading: boolean
  userOrganizationAccess: DashboardContextValue['userOrganizationAccess']
  setOrg: (org: Pick<Organization, 'id' | 'slug'>) => void
  organization: Pick<
    DashboardContextValue['organization'],
    'name' | 'slug' | 'id' | 'environments'
  >
  orgEnvSlug: string
  envSlug?: string
}

// consolidate display logic into a single function.
// also helpful for storybook, which does not have access to DashboardContext and must pass these values in as props.
export function useOrgSwitcher(): OrgSwitcherState {
  const { me, userOrganizationAccess, isMeLoading, organization } =
    useDashboard()

  const { orgEnvSlug, envSlug } = useOrgParams()

  const switchOrg = trpc.useMutation('organization.switch')

  const setOrg = (org: Pick<Organization, 'id' | 'slug'>) => {
    switchOrg
      .mutateAsync({
        organizationId: org.id,
      })
      .then(() => {
        window.location.assign(`/dashboard/${org.slug}`)
      })
      .catch(error => {
        logger.error('Failed switching to organization', {
          orgId: org.id,
          error,
        })
      })
  }

  return {
    me,
    userOrganizationAccess,
    isMeLoading,
    setOrg,
    organization,
    orgEnvSlug,
    envSlug,
  }
}
