import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from 'react'
import { useLocation, useNavigate, Navigate, useParams } from 'react-router-dom'
import { UserAccessPermission } from '@prisma/client'
import {
  inferQueryInput,
  inferQueryOutput,
  QueryNames,
  trpc,
} from '~/utils/trpc'
import IVButton from '~/components/IVButton'
import IVSpinner from '~/components/IVSpinner'
import { useMe } from './MeContext'
import NotificationCenter from './NotificationCenter'
import useHasSession from '~/utils/useHasSession'
import { hasPermission } from '~/utils/permissions'
import { useRecoilState, useRecoilValue } from 'recoil'
import {
  PerformLoginRedirect,
  redirectAfterLogin,
} from '~/components/LoginRedirect'
import { dashboardL1Paths } from '~/App'
import { useOrgParams } from '~/utils/organization'
import { extractOrgSlug } from '~/utils/extractOrgSlug'
import { KBarProvider } from 'kbar'
import CommandBar, { DynamicCommandBarActions } from './CommandBar'
import DashboardNav from './DashboardNav'
import {
  DEVELOPMENT_ORG_ENV_SLUG,
  PRODUCTION_ORG_ENV_SLUG,
} from '~/utils/environments'
import ControlPanel, {
  ControlPanelContext,
  ControlPanelProps,
} from './TransactionUI/_presentation/ControlPanel'
import { consoleUIState } from './Console'

type PageDataRefreshState =
  | null
  | 'first_load_in_progress'
  | 'loaded'
  | 'refreshing'

type FetchedOrg = NonNullable<inferQueryOutput<'organization.slug'>>
type FetchedOrgEnv = inferQueryOutput<'environments.single'>

export interface DashboardContextValue {
  me: NonNullable<inferQueryOutput<'user.me'>>
  isMeLoading: boolean
  userOrganizationAccess: NonNullable<
    inferQueryOutput<'user.me'>
  >['userOrganizationAccess'][0]
  organization: FetchedOrg
  organizationEnvironment: FetchedOrgEnv
  isOrgLoading: boolean
  refetchUser: () => void
  refetchOrg: () => void
  setPageDataRefreshState: React.Dispatch<
    React.SetStateAction<PageDataRefreshState>
  >
  userSession: inferQueryOutput<'auth.session.user'>
  globalFeatureFlags:
    | inferQueryOutput<'dashboard.global-feature-flags'>
    | undefined
  integrations: inferQueryOutput<'dashboard.integrations'> | undefined
}

export const DashboardContext = createContext<
  DashboardContextValue | undefined
>(undefined)

export const OrganizationContext = createContext<
  | {
      organization: FetchedOrg
      organizationEnvironment: FetchedOrgEnv
    }
  | undefined
>(undefined)

const DashboardLoadingState = ({ children }: { children?: ReactNode }) => (
  <div className="w-full min-h-screen flex items-stretch">
    <div className="flex-1 p-4 space-y-4">
      <IVSpinner fullPage />
    </div>
    <div className="hidden">{children}</div>
  </div>
)

function ToastLoader() {
  return (
    <div className="absolute right-4 bottom-4 opacity-75 h-10 w-10 flex items-center justify-center">
      <IVSpinner delayDuration={800} />
    </div>
  )
}

export default function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error(
      'useDashboard must be used within a DashboardContextProvider'
    )
  }
  return context
}

export function useDashboardOptional() {
  const context = useContext(DashboardContext)
  return context
}

export function useOrganization() {
  const dashContext = useContext(DashboardContext)
  const orgContext = useContext(OrganizationContext)

  let org: FetchedOrg | null = null

  if (dashContext !== undefined) {
    org = dashContext.organization
  } else if (orgContext !== undefined) {
    org = orgContext.organization
  } else {
    throw new Error(
      'useOrganization must be used within a DashboardContextProvider or OrganizationContextProvider'
    )
  }

  return org
}

export function useOrganizationOptional() {
  const dashContext = useContext(DashboardContext)
  const orgContext = useContext(OrganizationContext)

  let org: FetchedOrg | null = null

  if (dashContext !== undefined) {
    org = dashContext.organization
  } else if (orgContext !== undefined) {
    org = orgContext.organization
  }

  return org
}

/**
 * Check if the user has the specified permission. Be sure to check permissions in any backend routes as well.
 *
 * @param options.redirectToDashboardHome - If the user does not have permission, redirect them to the organization dashboard home page.
 *
 * @returns true if the user has access, false if not, or undefined if user information is still loading
 */
export function useHasPermission(
  permission: UserAccessPermission,
  {
    redirectToDashboardHome = false,
  }: {
    redirectToDashboardHome?: boolean
  } = {}
): boolean | undefined {
  const navigate = useNavigate()
  const {
    me,
    userOrganizationAccess,
    organization,
    isMeLoading,
    isOrgLoading,
  } = useDashboard()

  const doesHavePermission = useMemo(() => {
    if (isMeLoading || isOrgLoading) {
      return undefined
    }

    if (
      me &&
      organization &&
      hasPermission(userOrganizationAccess, permission)
    ) {
      return true
    }

    return false
  }, [
    me,
    organization,
    userOrganizationAccess,
    permission,
    isMeLoading,
    isOrgLoading,
  ])

  useEffect(() => {
    if (redirectToDashboardHome && doesHavePermission === false) {
      // Navigating after an immediate timeout causes it to happen in the next event loop task,
      // which is necessary for some reason for react-router to actually navigate
      const timeout = setTimeout(() => {
        navigate(`/dashboard/${organization.slug}`, { replace: true })
      }, 0)

      return () => {
        clearTimeout(timeout)
      }
    }
  }, [doesHavePermission, redirectToDashboardHome, organization, navigate])

  return doesHavePermission
}

export function useDashboardPageQuery<T extends QueryNames>(
  params: [T, inferQueryInput<T>]
) {
  const { orgSlug, envSlug } = useOrgParams()
  const { setPageDataRefreshState, me } = useDashboard()

  // @ts-ignore unclear why TS yells about this, but it gets the inference right in the end
  const result = trpc.useQuery(params)

  const { isRefetching, status, refetch, remove } = result

  // Refetch data when user (shouldn't happen), or org (may happen) changes
  useEffect(() => {
    remove()
    refetch()
  }, [setPageDataRefreshState, me.id, orgSlug, envSlug, remove, refetch])

  useEffect(() => {
    setPageDataRefreshState(prev => {
      if (prev === null) return 'first_load_in_progress'
      if (isRefetching) return 'refreshing'
      if (status === 'success') return 'loaded'
      return prev
    })
  }, [setPageDataRefreshState, isRefetching, status])

  return result
}

function useOrgEnvironmentQuery({
  envSlug,
  enabled,
}: {
  envSlug: string | null
  enabled: boolean
}) {
  const { orgSlug } = useParams()
  const location = useLocation()
  if (
    envSlug === null &&
    location.pathname.startsWith(`/dashboard/${orgSlug}/develop`)
  ) {
    envSlug = DEVELOPMENT_ORG_ENV_SLUG
  }

  return trpc.useQuery(
    ['environments.single', { slug: envSlug ?? undefined }],
    {
      enabled,
      retry(failureCount, error) {
        // Don't retry nonexistent environments
        return (
          error?.data?.code !== 'NOT_FOUND' &&
          error?.data?.code !== 'FORBIDDEN' &&
          error?.data?.code !== 'UNAUTHORIZED' &&
          failureCount <= 3
        )
      },
    }
  )
}

export function OrganizationProvider({ children }) {
  const { orgSlug, envSlug } = useOrgParams()

  const organization = trpc.useQuery(
    ['organization.slug', { slug: orgSlug as string }],
    {
      enabled: !!orgSlug,
      retry(failureCount, error) {
        // Don't retry nonexistent organization slugs
        return (
          error?.data?.code !== 'NOT_FOUND' &&
          error?.data?.code !== 'FORBIDDEN' &&
          error?.data?.code !== 'UNAUTHORIZED' &&
          failureCount <= 3
        )
      },
    }
  )

  const organizationEnvironment = useOrgEnvironmentQuery({
    envSlug: envSlug as string,
    enabled: !!envSlug && !!organization.data?.id,
  })

  if (
    !organization.data ||
    organization.isLoading ||
    !organizationEnvironment.data
  ) {
    return null
  }

  return (
    <OrganizationContext.Provider
      value={{
        organization: organization.data,
        organizationEnvironment: organizationEnvironment.data,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}

export function DashboardProvider({ children }) {
  // not using useOrgParams here because the current page may not have an org slug yet
  const params = useParams<{ orgSlug: string }>()
  const { orgSlug, envSlug, orgEnvSlug, isDevMode } = extractOrgSlug(params)

  const { me, refetch: refetchUser, isLoading: isMeLoading } = useMe()
  const [pageDataRefreshState, setPageDataRefreshState] =
    useState<PageDataRefreshState>(null)
  const { hasSession, needsMfa, isLoading: isSessionLoading } = useHasSession()
  const loginRedirect = useRecoilValue(redirectAfterLogin)
  const location = useLocation()
  const { invalidateQueries } = trpc.useContext()

  const organization = trpc.useQuery(
    ['organization.slug', { slug: orgSlug as string }],
    {
      enabled: !!orgSlug,
      retry(failureCount, error) {
        // Don't retry nonexistent organization slugs
        return (
          error?.data?.code !== 'NOT_FOUND' &&
          error?.data?.code !== 'FORBIDDEN' &&
          error?.data?.code !== 'UNAUTHORIZED' &&
          failureCount <= 3
        )
      },
    }
  )
  const userSession = trpc.useQuery(['auth.session.user'])
  const session = trpc.useQuery(['auth.session.session'])
  const globalFeatureFlags = trpc.useQuery(['dashboard.global-feature-flags'])
  const integrations = trpc.useQuery(['dashboard.integrations'])
  const organizationEnvironment = useOrgEnvironmentQuery({
    envSlug: envSlug ?? null,
    enabled: !!organization.data?.id,
  })

  useEffect(() => {
    if (organization.data?.id) {
      window.__INTERVAL_ORGANIZATION_ID = organization.data.id
      invalidateQueries(['auth.session.user'])
    }

    return () => {
      window.__INTERVAL_ORGANIZATION_ID = undefined
      invalidateQueries(['auth.session.user'])
    }
  }, [organization.data, invalidateQueries])

  useEffect(() => {
    if (organizationEnvironment.data?.id) {
      window.__INTERVAL_ORGANIZATION_ENVIRONMENT_ID =
        organizationEnvironment.data.id
      invalidateQueries(['auth.session.user'])
    }

    return () => {
      window.__INTERVAL_ORGANIZATION_ENVIRONMENT_ID = undefined
      invalidateQueries(['auth.session.user'])
    }
  }, [organizationEnvironment.data, invalidateQueries])

  const mode = isDevMode ? 'console' : 'live'
  const [hostState] = useRecoilState(consoleUIState)
  const [controlPanelState, setControlPanelState] = useState<ControlPanelProps>(
    {
      notifications: [],
      state: hostState,
      transaction: null,
      mode,
    }
  )

  const clearControlPanelState = useCallback(() => {
    setControlPanelState({
      notifications: [],
      state: hostState,
      transaction: null,
      mode,
    })
  }, [mode, hostState])

  if (!hasSession && !isSessionLoading) {
    // Unauthenticated, redirect to login page
    return (
      <Navigate
        to={needsMfa ? '/verify-mfa' : '/login'}
        state={{ loginRedirect: location.pathname }}
        replace
      />
    )
  }

  // We do me checks first so we can redirect home if no user exists and other
  // requests are still loading
  if (isMeLoading) {
    return <DashboardLoadingState />
  }

  if (!me) {
    return <Navigate to="/" replace />
  }

  if (
    organization.isLoading ||
    organizationEnvironment.isLoading ||
    userSession.isLoading
  ) {
    return <DashboardLoadingState />
  }

  const defaultSlug = me.userOrganizationAccess[0]?.organization.slug

  if (!defaultSlug) {
    // Shouldn't be possible, malformed user organization access
    return (
      <ErrorMessage message="You do not have access to any organizations. Please contact help@interval.com." />
    )
  }

  if (loginRedirect) {
    return <PerformLoginRedirect to={loginRedirect} />
  }

  // in most cases, will not have a slug if accessing a page that does not exist
  if (!orgSlug || !orgEnvSlug) {
    return (
      <Navigate to={`/dashboard/${defaultSlug}${location.search}`} replace />
    )
  }

  // Superfluous checks here for clarity
  if (!organization.data || organization.isError) {
    if (organization?.error?.data?.code === 'NOT_FOUND') {
      let pathWithSlug: string

      if (dashboardL1Paths.has(orgSlug)) {
        pathWithSlug = location.pathname.replace(
          `/dashboard`,
          `/dashboard/${defaultSlug}`
        )
      } else {
        pathWithSlug = location.pathname.replace(
          `/dashboard/${orgEnvSlug}`,
          `/dashboard/${defaultSlug}`
        )
      }

      pathWithSlug += location.search

      // No actual organization specified (eg /dashboard/settings/account)
      return <Navigate to={pathWithSlug} replace />
    } else if (organization?.error?.data?.code === 'UNAUTHORIZED') {
      return <ErrorMessage />
    } else {
      // Some error other than NOT_FOUND
      return <ErrorMessage />
    }
  }

  if (
    integrations.data?.workos &&
    organization.data.requireMfa &&
    !session.isLoading &&
    !session.data?.hasMfa
  ) {
    return <Navigate to={`/enroll-mfa?orgSlug=${organization.data.slug}`} />
  }

  if (
    !userSession.data?.orgId ||
    userSession.data?.orgEnvId !== organizationEnvironment.data?.id
  ) {
    return <DashboardLoadingState />
  }

  if (
    (orgSlug !== orgEnvSlug &&
      envSlug &&
      envSlug !== PRODUCTION_ORG_ENV_SLUG &&
      organizationEnvironment.error?.data?.code === 'NOT_FOUND') ||
    !organizationEnvironment.data
  ) {
    return (
      <Navigate
        to={location.pathname.replace(
          `/dashboard/${orgEnvSlug}`,
          `/dashboard/${orgSlug}`
        )}
        replace
      />
    )
  }

  const userOrganizationAccess = me.userOrganizationAccess.find(
    access => access.organization.slug === orgSlug
  )

  if (!userOrganizationAccess) {
    // Shouldn't be possible
    return <ErrorMessage />
  }

  return (
    <DashboardContext.Provider
      value={{
        setPageDataRefreshState,
        me,
        isMeLoading,
        userOrganizationAccess,
        organizationEnvironment: organizationEnvironment.data,
        organization: organization.data,
        isOrgLoading: organization.isLoading,
        refetchUser,
        refetchOrg: organization.refetch,
        userSession: userSession.data,
        globalFeatureFlags: globalFeatureFlags.data,
        integrations: integrations.data,
      }}
    >
      <ControlPanelContext.Provider
        value={{
          state: controlPanelState,
          setState: setControlPanelState,
          clearState: clearControlPanelState,
        }}
      >
        <KBarProvider
          actions={[
            {
              id: 'search-actions',
              name: 'Search actions',
              keywords: 'actions find',
              shortcut: ['/'],
              subtitle: 'Search for your actions by name or slug',
            },
          ]}
          options={{
            // kbar adds overflow:hidden to the body when open, but in the Interval
            // dashboard the main scrolling element is a div, not the body, so we
            // don't need to set any margins on the body when the kbar is open.
            disableScrollbarManagement: true,
          }}
        >
          <DynamicCommandBarActions />
          <CommandBar />
          <div className="h-screen-ios grid grid-cols-1 grid-rows-[auto_1fr_auto] iv-dashboard-v2-container">
            <DashboardNav />
            <main
              className="text-gray-600 overflow-y-scroll flex flex-col"
              style={{
                gridArea: 'main',
              }}
            >
              {pageDataRefreshState === 'first_load_in_progress' ? (
                <DashboardLoadingState>{children}</DashboardLoadingState>
              ) : (
                <>
                  {pageDataRefreshState === 'refreshing' && <ToastLoader />}
                  {children}
                </>
              )}
            </main>
            <ControlPanel {...controlPanelState} />
          </div>
          <NotificationCenter />
        </KBarProvider>
      </ControlPanelContext.Provider>
    </DashboardContext.Provider>
  )
}

function ErrorMessage({ message }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center z-20 bg-white">
      <div>
        <p className="mb-4">{message ?? 'An unknown error occurred.'}</p>
        <IVButton theme="primary" label="Go to dashboard" href={`/dashboard`} />
      </div>
    </div>
  )
}
