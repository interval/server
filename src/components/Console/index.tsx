import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { atom, useRecoilState } from 'recoil'
import { inferQueryOutput, trpc, useQueryClient } from '~/utils/trpc'
import IVSpinner from '~/components/IVSpinner'
import ActionsList from '~/components/ActionsList'
import ConsoleOnboarding from '~/components/ConsoleOnboarding'
import { PendingConnectionIndicator } from '~/components/TransactionUI/_presentation/TransactionLayout'
import { UI_STATE } from '~/components/TransactionUI/useTransaction'
import { hasRecentlyConnectedToConsole } from '~/pages/dashboard/[orgSlug]/develop'
import EmptyState from '~/components/EmptyState'
import IconCode from '~/icons/compiled/Code'
import { useHasPermission } from '~/components/DashboardContext'
import { useOrgParams } from '~/utils/organization'
import IVAlert from '~/components/IVAlert'
import IconInfo from '~/icons/compiled/Info'
import { ActionGroup } from '@prisma/client'
import PageHeading from '../PageHeading'
import ApiKeyButton from '../APIKeyButton'
import PageUI from '../PageUI'
import QueuedActionsList from '../QueuedActionsList'

function hasVisibleActions(data?: inferQueryOutput<'action.console.index'>) {
  return !!data?.actions.length || !!data?.groups.length || !!data?.currentPage
}

export const consoleUIState = atom<UI_STATE>({
  key: 'consoleUIState',
  default: 'IDLE',
})

function ConsoleExplanation() {
  const { orgSlug } = useOrgParams()

  return (
    <IVAlert
      id="console-explanation"
      dismissible={true}
      theme="info"
      icon={IconInfo}
      className="mb-4"
    >
      Actions you've defined using{' '}
      <Link
        to={`/dashboard/${orgSlug}/develop/keys`}
        className="text-primary-500 font-medium hover:opacity-60"
      >
        your personal development key
      </Link>{' '}
      will appear here in the Console when your SDK is connected. For help
      developing actions, check out our{' '}
      <Link
        to={`/examples`}
        className="text-primary-500 font-medium hover:opacity-60"
      >
        gallery of pre-built example tools
      </Link>
      .
    </IVAlert>
  )
}

export default function ConsoleIndex({
  mode,
  slugPrefix,
  pageTitle,
  breadcrumbs,
  canRunActions,
}: {
  canRunActions: boolean
  mode: 'console' | 'anon-console'
  slugPrefix?: string
  pageTitle?: string
  breadcrumbs?: ActionGroup[]
}) {
  const queryClient = useQueryClient()
  const [hasRecentlyConnected, setHasRecentlyConnected] = useRecoilState(
    hasRecentlyConnectedToConsole
  )
  // the cached page is shown while the host is reconnecting
  const [cachedCurrentPage, setCurrentPage] = useState<ActionGroup | null>(null)
  const [hostState, setHostState] = useRecoilState(consoleUIState)

  useHasPermission('RUN_DEV_ACTIONS', { redirectToDashboardHome: true })

  const [
    forceShowInstallationInstructions,
    setForceShowInstallationInstructions,
  ] = useState(false)

  useEffect(() => {
    if (hostState === 'IN_PROGRESS') {
      setForceShowInstallationInstructions(false)
    }
  }, [hostState])

  const actions = trpc.useQuery(
    [
      'action.console.index',
      {
        slugPrefix,
      },
    ],
    {
      refetchInterval: data => {
        // refetch every 1s if you don't have any online actions
        if (!hasVisibleActions(data)) return 1000

        // refetch every 3 seconds otherwise
        return 3000
      },
      refetchIntervalInBackground: false,
      // forces all page components to unmount when switching between pages,
      // also prevents some cached data from displaying before remote data is received.
      cacheTime: 0,
    }
  )

  const ctx = trpc.useContext()
  const { refetchQueries } = ctx

  const hasCreatedFirstAction = actions.data?.hasAnyActions ?? false

  // consider "recently connected" to be true if actions have
  // appeared on screen during this session.
  // this is also set to true when a user runs an action.
  useEffect(() => {
    if (hasVisibleActions(actions.data)) {
      setHasRecentlyConnected(true)
      setCurrentPage(actions.data?.currentPage ?? null)
    }
  }, [actions.data, setHasRecentlyConnected])

  // refetch navigation when actions begins refetching, e.g. when connecting to a restarting host
  useEffect(() => {
    if (actions.isFetching) {
      refetchQueries(['dashboard.structure', { mode: 'console' }], {
        exact: true,
      })
    }
  }, [actions.isFetching, refetchQueries])

  // "fake" host state based on presence of online or offline actions.
  // host is considered "reconnecting" if we've connected during this session but no actions are visible.
  useEffect(() => {
    setHostState(prev => {
      if (hasVisibleActions(actions.data)) {
        return 'IN_PROGRESS'
      }
      if (actions.isLoading && prev === 'IN_PROGRESS') {
        return 'IN_PROGRESS'
      }
      if (hasRecentlyConnected) {
        return 'HOST_DROPPED'
      }
      return 'IDLE'
    })
  }, [actions.data, setHostState, hasRecentlyConnected, actions.isLoading])

  const onRefresh = () => {
    actions.refetch()
  }

  if (actions.isLoading) {
    return (
      <div className="min-h-[400px] flex justify-center items-center">
        <IVSpinner delayDuration={300} className="w-8 text-gray-400" />
      </div>
    )
  }

  const fallback = hasVisibleActions(actions.data) ? (
    <div className="dashboard-container">
      <div className="-mb-2">
        <PageHeading
          title={pageTitle ?? 'Dashboard'}
          breadcrumbs={breadcrumbs}
        />
      </div>
      <ConsoleExplanation />
      <QueuedActionsList
        mode="console"
        queuedActions={actions.data?.queued ?? []}
        className="my-6"
        canDequeue
        onChange={queuedAction => {
          queryClient.setQueryData(['action.console.index', { slugPrefix }], {
            ...actions.data,
            queued:
              actions.data?.queued.filter(q => q.id !== queuedAction.id) ?? [],
          })
        }}
      />
      <ActionsList
        canRun={canRunActions}
        canConfigure={false} // no configuration in Console
        actions={actions.data?.actions ?? []}
        groups={actions.data?.groups ?? []}
        mode={mode}
        slugPrefix={slugPrefix}
        archivedActions={actions.data?.archivedActions ?? []}
      />
    </div>
  ) : hasRecentlyConnected ? (
    <PendingConnectionIndicator
      label="Waiting for connection..."
      onRefresh={onRefresh}
      isFetching={actions.isRefetching}
    />
  ) : hasCreatedFirstAction && !forceShowInstallationInstructions ? (
    <EmptyState
      Icon={IconCode}
      title="Connect from the SDK"
      actions={[
        {
          label: 'Show installation instructions',
          onClick: () => setForceShowInstallationInstructions(true),
          theme: 'plain',
          className: 'text-primary-500 hover:opacity-70 font-medium',
        },
        {
          label: 'Retry connection',
          onClick: onRefresh,
          theme: 'plain',
          className: 'text-primary-500 hover:opacity-70 font-medium',
          disabled: actions.isRefetching,
        },
      ]}
    >
      <p>Actions will appear here when your development server comes online.</p>
      <div className="pt-6 pb-2 space-y-3">
        <p>Use your personal development key to connect:</p>
        <ApiKeyButton />
      </div>
    </EmptyState>
  ) : (
    <div className="dashboard-container">
      <ConsoleOnboarding />
    </div>
  )

  const currentPage = actions.data?.currentPage ?? cachedCurrentPage

  if (currentPage?.hasHandler) {
    return (
      <PageUI
        page={currentPage}
        mode="console"
        breadcrumbs={breadcrumbs}
        fallback={fallback}
      />
    )
  }

  return fallback
}
