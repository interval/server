import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { trpc } from '~/utils/trpc'
import PageHeading from '~/components/PageHeading'
import IVSpinner from '~/components/IVSpinner'
import NotFound from '~/components/NotFound'
import { useHasPermission } from '~/components/DashboardContext'
import { notify } from '~/components/NotificationCenter'
import NavTabs, { NavTab } from '~/components/NavTabs'
import General from '~/components/ActionSettings/General'
import Notifications from '~/components/ActionSettings/Notifications'
import Permissions from '~/components/ActionSettings/Permissions'
import Schedule from '~/components/ActionSettings/Schedule'
import { getName } from '~/utils/actions'
import { useOrgParams } from '~/utils/organization'

/**
 * This is only for production actions.
 */
export default function ManageActionPage() {
  const { orgEnvSlug, ...params } = useOrgParams()
  const actionSlug = params['*'] as string
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab')

  const action = trpc.useQuery(
    ['action.one', { slug: actionSlug, environment: 'PRODUCTION' }],
    { refetchOnMount: 'always' }
  )

  const navItems: NavTab[] = [
    { path: '', tab: null, label: 'General' },
    {
      path: '?tab=permissions',
      tab: 'permissions',
      label: 'Permissions',
    },
    {
      path: '?tab=notifications',
      tab: 'notifications',
      label: 'Notifications',
    },
    {
      path: '?tab=schedule',
      tab: 'schedule',
      label: 'Schedule',
    },
  ]

  useHasPermission('WRITE_PROD_ACTIONS', {
    redirectToDashboardHome: true,
  })

  const isArchived = action.data?.metadata?.archivedAt ?? false

  const onSuccess = useCallback(() => {
    notify.success('Your changes were saved.')

    action.refetch()
  }, [action])

  const onError = useCallback(() => {
    notify.error(
      'There was a problem saving your changes. Please try again and reach out if you continue to experience issues.'
    )
  }, [])

  if (action.isLoading) {
    return <IVSpinner fullPage />
  }

  if (!action.data) {
    return <NotFound />
  }

  return (
    <div className="dashboard-container text-sm">
      <PageHeading title={getName(action.data)} />

      {!isArchived && (
        <div className="mt-4 mb-6">
          <NavTabs
            tabs={navItems.map(item => ({
              ...item,
              path: `/dashboard/${orgEnvSlug}/configure/${actionSlug}${item.path}`,
            }))}
          />
        </div>
      )}

      {tab === 'notifications' ? (
        <Notifications
          action={action.data}
          onSuccess={onSuccess}
          onError={onError}
          refetch={action.refetch}
        />
      ) : tab === 'permissions' ? (
        <Permissions
          action={action.data}
          onSuccess={onSuccess}
          onError={onError}
          refetch={action.refetch}
          isUsingCodeBasedPermissions={action.data?.isUsingCodeBasedPermissions}
        />
      ) : tab === 'schedule' ? (
        <Schedule
          action={action.data}
          onSuccess={onSuccess}
          onError={onError}
          refetch={action.refetch}
        />
      ) : (
        <General
          action={action.data}
          onSuccess={onSuccess}
          onError={onError}
          refetch={action.refetch}
        />
      )}
    </div>
  )
}
