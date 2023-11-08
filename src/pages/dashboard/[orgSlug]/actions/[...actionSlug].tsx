import { useState, useEffect, useCallback } from 'react'
import { Navigate, useSearchParams, useLocation } from 'react-router-dom'
import { trpc, QueryError } from '~/utils/trpc'
import { useHasPermission } from '~/components/DashboardContext'
import EmptyState from '~/components/EmptyState'
import IconPuzzled from '~/icons/compiled/Puzzled'
import TransactionLayout, {
  PendingConnectionIndicator,
} from '~/components/TransactionUI/_presentation/TransactionLayout'
import { getQueuedActionId } from '~/utils/getQueuedActionId'
import usePrevious from '~/utils/usePrevious'
import { OrganizationDashboard } from '..'
import { useStateFlagEnabled } from '~/utils/navigationHooks'
import { useOrgParams } from '~/utils/organization'
import { ActionGroup } from '@prisma/client'
import useDashboardStructure from '~/utils/useDashboardStructure'
import IconExternalLink from '~/icons/compiled/ExternalLink'
import PageLayout from '~/components/PageLayout'
import { hasRecentlySwitchedEnv } from '~/utils/useOrgEnvSwitcher'
import { useRecoilState } from 'recoil'

function NewTransactionError({ error }: { error: QueryError }) {
  const { orgEnvSlug } = useOrgParams()
  const isOffline = error.data?.code === 'TIMEOUT'
  const notFound = error.data?.code === 'NOT_FOUND'

  const [hasRecentlySwitched] = useRecoilState(hasRecentlySwitchedEnv)

  if (notFound && hasRecentlySwitched) {
    return <Navigate to={`/dashboard/${orgEnvSlug}/actions`} replace />
  }

  return (
    <EmptyState
      title={
        isOffline
          ? 'Action not reachable'
          : notFound
          ? 'Action not found'
          : 'Problem creating action'
      }
      Icon={IconPuzzled}
      actions={[
        {
          label: 'Return home',
          href: '/dashboard',
        },
      ]}
    >
      {isOffline ? (
        <p>
          Sorry, we were unable to start this action. Please confirm that the{' '}
          <a
            href="https://interval.com/docs/deployments/"
            target="_blank"
            className="inline-flex items-center text-primary-500 hover:opacity-60 font-medium"
          >
            action deployment
            <IconExternalLink className="w-4 h-4 relative -top-px opacity-50 ml-1" />
          </a>{' '}
          is online and connected to Interval. Please let us know if you
          continue to experience issues.
        </p>
      ) : notFound ? (
        <p>
          Sorry, we couldn't find this action. Please double check the address
          and let us know if you continue to experience issues.
        </p>
      ) : (
        <p>
          Sorry, there was a problem creating this transaction. Please try again
          and let us know if you continue to experience issues.
        </p>
      )}
    </EmptyState>
  )
}

function NewTransactionPage({ breadcrumbs }: { breadcrumbs?: ActionGroup[] }) {
  const { orgEnvSlug, ...params } = useOrgParams<{ '*': string }>()
  const actionSlug = params['*'] as string
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const canRunActions = useHasPermission('RUN_PROD_ACTIONS', {
    redirectToDashboardHome: true,
  })
  const [completedTransactionId, setCompletedTransactionId] = useState<
    string | null
  >(null)
  const addTransaction = trpc.useMutation('transaction.add')
  const completedTransaction = trpc.useQuery(
    [
      'transaction.dashboard.show',
      {
        transactionId: completedTransactionId as string,
      },
    ],
    {
      enabled: !!completedTransactionId,
    }
  )

  {
    const { refetch, data, isFetching } = completedTransaction
    useEffect(() => {
      if (!isFetching && data && data.status !== 'COMPLETED') {
        refetch()
      }
    }, [data, refetch, isFetching])
  }

  const prevSearchParams = usePrevious(searchParams)

  useEffect(() => {
    if (
      searchParams !== prevSearchParams ||
      (actionSlug &&
        canRunActions &&
        !addTransaction.isLoading &&
        !addTransaction.isSuccess &&
        !addTransaction.isError)
    ) {
      const queuedActionId = getQueuedActionId(location)

      addTransaction.mutate({ actionSlug, queuedActionId })
    }
  }, [
    addTransaction,
    orgEnvSlug,
    searchParams,
    prevSearchParams,
    actionSlug,
    canRunActions,
    location,
  ])

  const [hasRecentlySwitched] = useRecoilState(hasRecentlySwitchedEnv)

  const { reset: resetAdd } = addTransaction
  const { remove: resetCompleted } = completedTransaction

  {
    const prevActionSlug = usePrevious(actionSlug)
    useEffect(() => {
      // Create new transaction for new slug when action slug changes.
      // We can't do this above easily because we want to avoid doing so when
      // action slug hasn't changed.
      if (prevActionSlug && actionSlug !== prevActionSlug) {
        setCompletedTransactionId(null)
        resetCompleted()
        resetAdd()
      }
    }, [actionSlug, prevActionSlug, resetAdd, resetCompleted])

    useStateFlagEnabled(
      'shouldCreateNewTransaction',
      () => {
        if (searchParams === prevSearchParams) {
          setCompletedTransactionId(null)
          resetCompleted()
          resetAdd()
        }
      },
      [resetAdd, resetCompleted]
    )
  }

  const onNewTransaction = useCallback(() => {
    setCompletedTransactionId(null)
    resetAdd()
    resetCompleted()
  }, [resetAdd, resetCompleted])

  if (!actionSlug) {
    return <Navigate to={`/dashboard/${orgEnvSlug}/actions`} replace />
  }

  if (addTransaction.isError) {
    return <NewTransactionError error={addTransaction.error} />
  }

  if (addTransaction.isLoading && hasRecentlySwitched) {
    return null
  }

  const transaction =
    (completedTransactionId && completedTransaction.data?.status === 'COMPLETED'
      ? completedTransaction.data
      : undefined) ??
    addTransaction.data ??
    null

  if (!transaction) {
    return <PendingConnectionIndicator />
  }

  return (
    <TransactionLayout
      transaction={transaction}
      mode="live"
      breadcrumbs={breadcrumbs}
      onStateChange={state => {
        if (state === 'COMPLETED' && addTransaction.data) {
          setCompletedTransactionId(addTransaction.data.id)
        }
      }}
      onNewTransaction={onNewTransaction}
    />
  )
}

export default function ActionsPage() {
  const { orgEnvSlug } = useOrgParams()
  const params = useOrgParams<{ '*': string }>()
  const actionSlug = params['*'] as string
  const canRunActions = useHasPermission('RUN_PROD_ACTIONS')

  const { structure, pageExists, currentPage } = useDashboardStructure({
    mode: 'live',
    actionSlug,
  })

  const isPage = !actionSlug || pageExists || structure.isLoading

  if (!isPage && !canRunActions) {
    return <Navigate to={`/dashboard/${orgEnvSlug}/actions`} replace />
  }

  return (
    <PageLayout mode="live">
      {isPage ? (
        <OrganizationDashboard
          slugPrefix={actionSlug}
          pageTitle={currentPage?.name}
        />
      ) : (
        <NewTransactionPage />
      )}
    </PageLayout>
  )
}
