import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Prisma } from '@prisma/client'
import relativeTime from '~/utils/date'
import { dateTimeFormatter } from '~/utils/formatters'
import { statusEnumToString } from '~/utils/text'
import classNames from 'classnames'
import { useOrgParams } from '~/utils/organization'
import { ActionWithPossibleMetadata } from '~/utils/types'
import IVButton from '~/components/IVButton'
import IconSchedule from '~/icons/compiled/Schedule'
import EmptyState from '~/components/EmptyState'
import useDashboard from '~/components/DashboardContext'
import useSearchParams from '~/utils/useSearchParams'

interface TransactionsListProps {
  transactions: (Prisma.TransactionGetPayload<{
    include: {
      owner: true
      actionSchedule: true
      actionScheduleRun: true
    }
  }> & {
    action: ActionWithPossibleMetadata
  })[]
}

export default function TransactionsList(props: TransactionsListProps) {
  const { orgSlug } = useParams()
  const [search, setSearch] = useSearchParams()

  const searchQuery = search.get('s')

  if (!props.transactions.length) {
    if (searchQuery) {
      return (
        <EmptyState
          title="No transactions found"
          children={
            <div className="text-center max-w-lg space-y-4">
              <p>
                We couldn't find any transactions matching your search query.
              </p>
              <p>
                <IVButton
                  theme="plain"
                  label="Clear search"
                  className="text-primary-500 font-medium hover:opacity-60"
                  onClick={() => {
                    setSearch(prev => ({
                      ...prev,
                      page: undefined,
                      s: undefined,
                    }))
                  }}
                />
              </p>
            </div>
          }
        />
      )
    }

    return (
      <EmptyState
        title="No transactions yet"
        children={
          <div className="text-left max-w-lg space-y-2">
            <p>
              <Link
                to="https://interval.com/docs/concepts/transactions"
                className="text-primary-500 font-medium hover:opacity-60"
              >
                Transactions
              </Link>{' '}
              are created each time an action is run.
            </p>
            <p>
              <Link
                to={`/dashboard/${orgSlug}/develop/actions`}
                className="text-primary-500 font-medium hover:opacity-60"
              >
                Visit the Development environment
              </Link>{' '}
              to install the SDK and develop your first actions. Then{' '}
              <Link
                to={`/dashboard/${orgSlug}/develop/keys`}
                className="text-primary-500 font-medium hover:opacity-60"
              >
                create a live key
              </Link>{' '}
              and{' '}
              <Link
                to="https://interval.com/docs/deployments"
                className="text-primary-500 font-medium hover:opacity-60"
              >
                deploy
              </Link>{' '}
              to run them and view your transaction history here.
            </p>
          </div>
        }
        actions={[
          {
            theme: 'secondary',
            href: `/dashboard/${orgSlug}/develop/actions`,
            label: <span>Go to Development &rsaquo;</span>,
          },
        ]}
      />
    )
  }

  return (
    <div className="overflow-hidden">
      <div
        role="list"
        className="divide-y divide-gray-200 border-b border-gray-200"
      >
        <div className="hidden grid-cols-[1fr_200px_200px_100px] py-4 px-1 text-xs font-medium text-gray-500 uppercase tracking-widest lg:grid">
          <div className="px-1">Action</div>
          <div className="px-1">Ran at</div>
          <div className="px-1">Ran by</div>
          <div className="px-1">Status</div>
        </div>
        {props.transactions.map(t => (
          <TransactionsListItem key={t.id} transaction={t} />
        ))}
      </div>
    </div>
  )
}

function TransactionsListItem(props: {
  transaction: TransactionsListProps['transactions'][0]
}) {
  const { transaction: t } = props
  const navigate = useNavigate()
  const { orgEnvSlug } = useOrgParams()
  const { me } = useDashboard()

  const didHostDrop = t.status === 'HOST_CONNECTION_DROPPED'
  const canNavigateToAction =
    (!didHostDrop && t.ownerId === me.id) || t.status === 'COMPLETED'

  return (
    <div
      className={classNames({
        'cursor-pointer': canNavigateToAction,
        'cursor-not-allowed opacity-80': didHostDrop,
      })}
      onClick={() => {
        if (!canNavigateToAction) return

        navigate(`/dashboard/${orgEnvSlug}/transactions/${t.id}`)
      }}
    >
      <div className="lg:hidden px-2 py-4">
        <p className="mb-2 text-gray-800">
          <strong className="font-medium">
            {t.action.metadata?.name ?? t.action.slug}
          </strong>
        </p>
        <p className="text-sm text-gray-600">
          Ran at: {dateTimeFormatter.format(t.createdAt)}
          <br />
          Ran by: {t.owner.firstName} {t.owner.lastName} ({t.owner.email})
          <br />
          Status: {statusEnumToString(t.resultStatus ?? t.status)}
        </p>
      </div>
      <div
        className={classNames(
          'hidden grid-cols-[1fr_200px_200px_100px] py-4 px-1 lg:grid text-sm text-gray-700',
          {
            'hover:bg-gray-50': canNavigateToAction,
          }
        )}
      >
        <div className="px-1">
          <div className="inline-flex items-center">
            {t.actionScheduleRun && (
              <IconSchedule className="w-4 h-4 text-gray-400 mr-1.5" />
            )}
            {t.action.metadata?.name ?? t.action.slug}
          </div>
        </div>
        <div className="px-1" title={dateTimeFormatter.format(t.createdAt)}>
          {relativeTime(t.createdAt, { fullDateThresholdInHours: 24 })}
        </div>
        <div className="px-1">
          {t.owner.firstName} {t.owner.lastName} ({t.owner.email})
        </div>
        <div className="px-1">
          <span
            className={classNames({
              'text-primary-500':
                t.status === 'RUNNING' || t.status === 'AWAITING_INPUT',
            })}
          >
            {statusEnumToString(t.resultStatus ?? t.status)}
          </span>
        </div>
      </div>
    </div>
  )
}
