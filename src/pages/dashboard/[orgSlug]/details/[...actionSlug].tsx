import { trpc } from '~/utils/trpc'
import PageHeading from '~/components/PageHeading'
import IVSpinner from '~/components/IVSpinner'
import NotFound from '~/components/NotFound'
import { useHasPermission } from '~/components/DashboardContext'
import { dateTimeFormatter } from '~/utils/formatters'
import IconPlay from '~/icons/compiled/Play'
import { useOrgParams } from '~/utils/organization'

/**
 * This is only for production actions.
 */
export default function ActionPage() {
  const { orgEnvSlug, ...params } = useOrgParams<{ '*': string }>()

  const actionSlug = params['*'] as string

  const action = trpc.useQuery(['action.one', { slug: actionSlug }])
  useHasPermission('READ_PROD_ACTIONS', {
    redirectToDashboardHome: true,
  })
  const canRunActions = useHasPermission('RUN_PROD_ACTIONS')

  if (action.isLoading) {
    return <IVSpinner fullPage />
  }

  if (!action.data) {
    return <NotFound />
  }

  // TODO: do we need to check RUN_PROD_ACTIONS here too? API should give us a single value for this
  const canRunAction = canRunActions && action.data.canRun

  return (
    <div className="dashboard-container space-y-4">
      <PageHeading
        title={action.data.metadata?.name || action.data.slug}
        actions={[
          {
            label: (
              <span className="flex-1 inline-flex items-center justify-center">
                <span>Run</span>
                <IconPlay className="w-4 ml-2 inline-block" />
              </span>
            ),
            disabled: !canRunAction,
            href: `/dashboard/${orgEnvSlug}/actions/${actionSlug}`,
          },
        ]}
      />

      <div className="px-4 py-5 sm:px-6">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {dateTimeFormatter.format(action.data.createdAt)}
            </dd>
          </div>
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Updated</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {dateTimeFormatter.format(action.data.updatedAt)}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
