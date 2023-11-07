import { useSearchParams, Link } from 'react-router-dom'
import PageHeading from '~/components/PageHeading'
import { useHasPermission } from '~/components/DashboardContext'
import { trpc } from '~/utils/trpc'
import IVSpinner from '~/components/IVSpinner'
import { EnvSwitcher } from '../history'
import SimpleTable from '~/components/SimpleTable'
import useTable, { IVTableRow } from '~/components/IVTable/useTable'
import { useMemo } from 'react'
import { getName, getStatus } from '~/utils/actions'
import classNames from 'classnames'
import EmptyState from '~/components/EmptyState'
import { hostStatusToString } from '~/utils/text'
import { useOrgParams } from '~/utils/organization'
import { HostInstanceStatus } from '@prisma/client'
import SettingsIcon from '~/icons/compiled/Settings'
import IVTooltip from '~/components/IVTooltip'
import { actionScheduleToDescriptiveString } from '~/utils/actionSchedule'
import IconSchedule from '~/icons/compiled/Schedule'

function StatusPill({ status }: { status?: HostInstanceStatus }) {
  return (
    <span
      className={classNames(
        'rounded-full text-xs inline-flex items-center font-medium px-2 py-1',
        {
          'bg-green-50 text-green-700': status === 'ONLINE',
          'bg-red-50 text-red-700':
            status === undefined || status === 'OFFLINE',
          'bg-amber-50 text--amber-700': status === 'UNREACHABLE',
        }
      )}
    >
      <span
        className={classNames('inline-block mr-1.5 w-1.5 h-1.5 rounded-full', {
          'bg-green-600': status === 'ONLINE',
          'bg-red-600': status === undefined || status === 'OFFLINE',
          'bg-amber-700': status === 'UNREACHABLE',
        })}
      ></span>
      {hostStatusToString(status ?? 'OFFLINE')}
    </span>
  )
}

export default function ManageActionsPage() {
  useHasPermission('READ_PROD_ACTIONS', { redirectToDashboardHome: true })
  const { orgEnvSlug } = useOrgParams()
  const [search] = useSearchParams()
  const canConfigureActions = useHasPermission('WRITE_PROD_ACTIONS')

  const allActions = trpc.useQuery([
    'action.all',
    {
      envSlug: search.get('environment'),
    },
  ])

  const data = useMemo<IVTableRow[]>(() => {
    if (!allActions.data) return []

    return allActions.data.actions.map((action, idx) => ({
      key: String(idx),
      data: {
        name: (
          <span>
            {getName(action)}
            {action.schedules.length > 0 && (
              <Link
                to={`/dashboard/${orgEnvSlug}/configure/${action.slug}?tab=schedule`}
                className="group align-middle inline-block relative -top-px"
              >
                <IVTooltip
                  text={
                    <span className="whitespace-nowrap">
                      {`Runs ${actionScheduleToDescriptiveString(
                        action.schedules[0]
                      )}`}
                    </span>
                  }
                >
                  <IconSchedule className="w-4 h-4 text-gray-400 ml-1.5 group-hover:opacity-70" />
                </IVTooltip>
              </Link>
            )}
          </span>
        ),
        slug: <span className="font-mono text-[13px]">{action.slug}</span>,
        status: <StatusPill status={getStatus(action)} />,
        actions: (
          <span className="block text-right">
            <Link
              to={`/dashboard/${orgEnvSlug}/configure/${action.slug}`}
              className={classNames(
                'text-gray-500 font-medium hover:opacity-60 inline-block pl-8',
                {
                  'opacity-40 pointer-events-none': !canConfigureActions,
                }
              )}
            >
              <SettingsIcon className="w-4 h-4 inline-block" />
            </Link>
          </span>
        ),
      },
    }))
  }, [allActions.data, canConfigureActions, orgEnvSlug])

  const table = useTable({
    data,
    columns: ['Name', 'Slug', 'Status', ''],
    totalRecords: data.length,
    isDownloadable: false,
    isFilterable: false,
  })

  return (
    <div className="dashboard-container space-y-4">
      <PageHeading title="All actions" />
      {allActions.isLoading ? (
        <IVSpinner fullPage />
      ) : (
        <SimpleTable
          table={table}
          columnClassNames={['w-auto', 'w-auto', 'w-auto', 'w-[100px]']}
          customFilters={
            <div className="-ml-2">
              <EnvSwitcher />
            </div>
          }
          emptyState={
            <EmptyState
              title="No actions found"
              children={
                <div className="text-center max-w-lg space-y-4">
                  <p>You have not created any actions yet.</p>
                </div>
              }
            />
          }
        />
      )}
    </div>
  )
}
