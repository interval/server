import { useLocation } from 'react-router-dom'
import { getNavHref, isCurrentPage, NavItemDef } from '~/utils/navigation'
import { useOrgParams } from '~/utils/organization'
import { hasPermission } from '~/utils/permissions'
import { isFeatureFlagEnabled } from '~/utils/featureFlags'
import useDashboard, { useOrganization } from '../DashboardContext'

const orgNav: NavItemDef[] = [
  {
    name: 'Settings',
    path: '/organization/settings',
    requiredPermission: 'WRITE_ORG_SETTINGS',
  },
  {
    name: 'Users',
    path: '/organization/users',
    requiredPermission: 'READ_USERS',
  },
  {
    name: 'Teams',
    path: '/organization/teams',
    // no requiredPermission because developers need to view teams
  },
  {
    name: 'Environments',
    path: '/organization/environments',
    requiredPermission: 'WRITE_ORG_SETTINGS',
  },
  {
    name: 'Serverless endpoints',
    path: '/develop/serverless-endpoints',
    requiredPermission: 'WRITE_ORG_SETTINGS',
  },
  {
    name: 'API keys',
    path: '/develop/keys',
    requiredPermissions: ['CREATE_PROD_API_KEYS', 'CREATE_DEV_API_KEYS'],
  },
]

const actionsNav: NavItemDef[] = [
  {
    name: 'All actions',
    path: '/organization/actions',
    requiredPermission: 'READ_PROD_ACTIONS',
  },
  {
    name: 'History',
    path: '/history',
    requiredPermission: 'READ_PROD_TRANSACTIONS',
  },
]

const userNav: NavItemDef[] = [
  {
    name: 'Settings',
    path: '/account',
  },
  {
    name: 'Log out',
    path: '/logout',
  },
]

export interface ControlPanelMenuItem extends Omit<NavItemDef, 'path'> {
  isCurrentPage?: boolean
  spaceAbove?: boolean
  path: string
  onClick?: () => void
}

export default function useControlPanelNav(): {
  [key: string]: ControlPanelMenuItem[]
} {
  const { orgEnvSlug } = useOrgParams()
  const location = useLocation()
  const { userOrganizationAccess, globalFeatureFlags } = useDashboard()
  const organization = useOrganization()

  const visibilityFilter = (item: NavItemDef) => {
    if (item.requiredFeatureFlag) {
      if (
        !isFeatureFlagEnabled(item.requiredFeatureFlag, {
          organization,
          globalFeatureFlags,
        })
      ) {
        return false
      }
    }

    if (item.requiredPermissions) {
      if (
        !item.requiredPermissions.some(p =>
          hasPermission(userOrganizationAccess, p)
        )
      ) {
        return false
      }
    }

    if (item.requiredPermission) {
      if (!hasPermission(userOrganizationAccess, item.requiredPermission)) {
        return false
      }
    }

    return true
  }

  return {
    orgNav: orgNav
      .map(item => ({
        ...item,
        path: getNavHref(orgEnvSlug, item.path),
        isCurrentPage: isCurrentPage(location.pathname, item),
      }))
      .filter(visibilityFilter),

    actionsNav: actionsNav
      .map(item => ({
        ...item,
        path: getNavHref(orgEnvSlug, item.path),
        isCurrentPage: isCurrentPage(location.pathname, item),
      }))
      .filter(visibilityFilter),

    userNav: userNav
      .map(item => ({
        ...item,
        path: getNavHref(orgEnvSlug, item.path),
        isCurrentPage: isCurrentPage(location.pathname, item),
      }))
      .filter(visibilityFilter),
  }
}
