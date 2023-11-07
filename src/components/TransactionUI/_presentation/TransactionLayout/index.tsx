import { useState, useEffect, useContext, useMemo } from 'react'
import { UseQueryResult } from 'react-query'
import TransactionHeader from '../TransactionHeader'
import { inferQueryOutput } from '~/utils/trpc'
import TransactionUI from '../..'
import useTransaction, { UI_STATE } from '../../useTransaction'
import IVSpinner from '~/components/IVSpinner'
import { ControlPanelContext } from '../ControlPanel'
import { ActionMode } from '~/utils/types'
import useBackPath from '~/utils/useBackPath'
import { ActionGroup, Transaction } from '@prisma/client'
import useDashboardStructure from '~/utils/useDashboardStructure'
import { useParams } from 'react-router-dom'
import ErrorState from '../ErrorState'

interface TransactionLayoutProps {
  transaction: NonNullable<inferQueryOutput<'transaction.dashboard.show'>>
  mode: ActionMode
  onNewTransaction?: () => void
  onStateChange?: (state: UI_STATE) => void
  history?: UseQueryResult<inferQueryOutput<'transaction.console.action.list'>>
  existingTransactionId?: string | null
  state?: UI_STATE | null
  breadcrumbs?: ActionGroup[]
}

export function PendingConnectionIndicator({
  label,
  onRefresh,
  isFetching,
  className = 'py-24 -mt-24',
  delayDuration = 500,
  message,
}: {
  label?: string
  onRefresh?: () => void
  isFetching?: boolean
  className?: string
  delayDuration?: number
  message?: string
}) {
  const [shouldShow, setShouldShow] = useState(delayDuration === 0)

  useEffect(() => {
    const to = setTimeout(() => {
      setShouldShow(true)
    }, delayDuration)
    return () => {
      clearTimeout(to)
    }
  }, [delayDuration])

  if (!shouldShow) return null

  return (
    <div
      className={`flex-1 flex flex-col justify-center items-center text-sm text-center text-gray-500 ${className}`}
    >
      <div className="flex flex-col items-center h-48 py-24">
        <IVSpinner className="w-6 h-6 text-gray-300 mb-2" />
        {label && (
          <p className="text-base font-medium text-gray-700">{label}</p>
        )}
        {message && <p className="text-sm max-w-lg text-gray-500">{message}</p>}
        {onRefresh && (
          <div className="pt-4">
            <button
              className="text-primary-500 font-medium hover:opacity-60"
              onClick={onRefresh}
              disabled={isFetching}
            >
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TransactionLayout(props: TransactionLayoutProps) {
  const params = useParams<{ '*': string }>()
  const actionSlugParam = params['*']
  const { setState: setControlPanelState, clearState: clearControlPanelState } =
    useContext(ControlPanelContext)

  const [transactionUpdates, setTransactionUpdates] =
    useState<Partial<Transaction> | null>(null)
  const { uiRef, ...transactionState } = useTransaction({
    transaction: props.transaction,
    mode: props.mode,
    updateTransaction: setTransactionUpdates,
  })

  const { transaction } = props
  {
    const status = transaction?.status
    const { state, register } = transactionState
    useEffect(() => {
      if (
        !status ||
        status === 'RUNNING' ||
        status === 'PENDING' ||
        status === 'AWAITING_INPUT'
      ) {
        return register()
      }
      // We don't want to rerun this when status changes
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [register])

    const { onStateChange } = props
    useEffect(() => {
      if (onStateChange) {
        onStateChange(state)
      }
    }, [state, onStateChange])
  }

  const actionSlug = transaction?.action.slug

  const { actionTitle } = useDashboardStructure({
    mode: props.mode,
    actionSlug: actionSlug ?? actionSlugParam,
    action: transaction?.action,
    enabled: true,
  })

  const backPath = useBackPath()

  useEffect(() => {
    setControlPanelState({
      state: transactionState.state,
      logs: transactionState.logLines,
      notifications: transactionState.notifications,
      transaction,
      mode: props.mode,
      history: props.onNewTransaction
        ? {
            onNewTransaction: props.onNewTransaction,
            currentTransactionId: props.existingTransactionId,
          }
        : undefined,
    })
  }, [
    setControlPanelState,
    transaction,
    transactionState.state,
    transactionState.logLines,
    transactionState.notifications,
    props.mode,
    props.onNewTransaction,
    props.existingTransactionId,
  ])

  useEffect(() => clearControlPanelState, [clearControlPanelState])

  const updatedTransaction = useMemo(() => {
    return {
      ...props.transaction,
      ...transactionUpdates,
    }
  }, [props.transaction, transactionUpdates])

  return (
    <div
      // this component's parent element is a grid element that vertically fills the screen.
      // we need this div to fill the entire space so floating elements like dropdowns aren't cut off.
      className="flex-1 flex flex-col"
    >
      <TransactionHeader
        mode={props.mode}
        state={transactionState.state}
        onNewTransaction={props.onNewTransaction}
        title={actionTitle}
        breadcrumbs={
          props.breadcrumbs
            ? [
                ...props.breadcrumbs,
                { name: actionTitle, slug: actionSlug ?? '' },
              ]
            : undefined
        }
        isBackgroundable={props.transaction?.action.backgroundable ?? undefined}
        shouldWarnOnClose={props.transaction?.action.warnOnClose}
        cancelButton={{
          href: backPath,
        }}
        metadata={
          props.transaction?.queuedAction
            ? [
                {
                  title: 'Queued action',
                  value: 'Using queued action',
                },
              ]
            : undefined
        }
      />
      <div
        // pt-0 is important for elements with sticky headers
        className="flex-1 p-4 sm:p-6 pt-0 sm:pt-0"
        ref={uiRef}
      >
        <TransactionUI
          key={updatedTransaction.id}
          {...transactionState}
          transaction={updatedTransaction}
          onStateChange={props.onStateChange}
          mode={props.mode}
        />
      </div>
      <ErrorState
        mode={props.mode}
        state={transactionState.state}
        onRefresh={transactionState.register}
      />
    </div>
  )
}
