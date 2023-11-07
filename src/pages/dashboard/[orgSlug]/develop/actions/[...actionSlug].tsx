import { useEffect, useState, useCallback } from 'react'
import { useParams, useLocation, Navigate } from 'react-router-dom'
import { useHasPermission } from '~/components/DashboardContext'
import useConsole from '~/components/TransactionUI/useConsole'
import TransactionLayout, {
  PendingConnectionIndicator,
} from '~/components/TransactionUI/_presentation/TransactionLayout'
import { getQueuedActionId } from '~/utils/actions'
import ConsoleIndex from '~/components/Console'
import { ActionGroup } from '@prisma/client'
import useDashboardStructure from '~/utils/useDashboardStructure'
import { useOrgParams } from '~/utils/organization'
import PageLayout from '~/components/PageLayout'
import { useRecoilState } from 'recoil'
import { hasRecentlySwitchedEnv } from '~/utils/useOrgEnvSwitcher'

export function ConsoleAction({
  breadcrumbs,
}: {
  breadcrumbs?: ActionGroup[]
}) {
  const { orgSlug } = useOrgParams()
  const params = useParams<{ '*': string }>()
  const actionSlug = params['*'] as string
  const [connectionError, setConnectionError] = useState<string | undefined>(
    undefined
  )

  const location = useLocation()
  const queuedActionId = getQueuedActionId(location)

  const {
    handleStateChange,
    transaction,
    isLoading,
    error,
    existingTransactionId,
    prevTransactionState,
    onNewTransaction,
  } = useConsole({ actionSlug, queuedActionId })

  const [hasRecentlySwitched] = useRecoilState(hasRecentlySwitchedEnv)

  const setNotFound = useCallback(() => {
    if (error?.data?.code === 'NOT_FOUND') {
      setConnectionError(
        "Sorry, we couldn't find this action. Please double check your development server is online and the URL address matches your action's slug."
      )
    } else {
      setConnectionError(undefined)
    }
  }, [error])

  useEffect(() => {
    if (error && error.data?.code === 'NOT_FOUND') {
      const timeout = setTimeout(setNotFound, 3000)

      return () => {
        clearTimeout(timeout)
      }
    }
  }, [error, setNotFound])

  if (error?.data?.code === 'NOT_FOUND' && hasRecentlySwitched) {
    return <Navigate to={`/dashboard/${orgSlug}/develop/actions`} replace />
  }

  if (isLoading && hasRecentlySwitched) {
    return null
  }

  if (!transaction) {
    return <PendingConnectionIndicator message={connectionError} />
  }

  return (
    <TransactionLayout
      transaction={transaction}
      state={prevTransactionState}
      onNewTransaction={onNewTransaction}
      mode="console"
      onStateChange={handleStateChange}
      breadcrumbs={breadcrumbs}
      existingTransactionId={existingTransactionId}
    />
  )
}

export default function ConsoleActionPage() {
  const canRunActions = useHasPermission('RUN_DEV_ACTIONS', {
    redirectToDashboardHome: true,
  })

  const params = useParams<{ '*': string }>()
  const actionSlug = params['*'] as string

  const [slugPageState, setSlugPageState] = useState({
    actionSlug,
    pageExists: false,
  })

  const { envSlug, orgSlug } = useOrgParams()

  const { structure, actionExists, pageExists, currentPage } =
    useDashboardStructure({
      mode: 'console',
      actionSlug,
      refetchInterval: data => {
        if (!data?.groups.length && !data?.actions.length) {
          return 1000
        }

        return 5000
      },
    })

  useEffect(() => {
    setSlugPageState(prevState => {
      if (pageExists) {
        return {
          actionSlug,
          pageExists,
        }
      }

      if (actionExists) {
        return {
          actionSlug,
          pageExists: false,
        }
      }

      if (actionSlug !== prevState.actionSlug) {
        return {
          actionSlug,
          pageExists: false,
        }
      }

      return prevState
    })
  }, [pageExists, actionSlug, actionExists])

  // prevent accessing the console for non-default environments
  if (envSlug) {
    return <Navigate to={`/dashboard/${orgSlug}/develop/actions`} />
  }

  return (
    <PageLayout mode="console">
      {!actionSlug ||
      pageExists ||
      slugPageState.pageExists ||
      structure.isLoading ? (
        <ConsoleIndex
          mode="console"
          canRunActions={canRunActions || false}
          slugPrefix={actionSlug}
          pageTitle={currentPage?.name}
        />
      ) : (
        <ConsoleAction />
      )}
    </PageLayout>
  )
}
