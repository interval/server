import { useState, useEffect, createContext, Suspense } from 'react'
import { ioSchema } from '@interval/sdk/dist/ioSchema'
import InputSpreadsheet from './InputSpreadsheet/lazy'
import { inferQueryOutput } from '~/utils/trpc'
import useTransaction, { UI_STATE } from './useTransaction'
import { RCTResponderProps } from '~/components/RenderIOCall'
import { RenderIOCall } from '~/components/RenderIOCall'
import { RenderContextProvider } from '~/components/RenderContext'
import CompletionState from './_presentation/CompletionState'
import {
  Indeterminate,
  Progress,
  InlineLoading,
} from './_presentation/LoadingState'
import ConfirmIdentity from './ConfirmIdentity'
import { PendingConnectionIndicator } from './_presentation/TransactionLayout'
import { useActionUrlBuilder } from '~/utils/actions'
import { useUploadUrlFetcher } from '~/utils/uploads'
import { ActionMode } from '~/utils/types'
import useTransactionNavigationWarning from '~/utils/useTransactionNavigationWarning'

export const ActionModeContext = createContext<ActionMode>('live')

export const UnimplementedComponents: {
  [Property in keyof typeof ioSchema]?: (
    props: RCTResponderProps<Property>
  ) => React.ReactNode
} = {
  // not implemented by the @ui package
  INPUT_SPREADSHEET: InputSpreadsheet,
  CONFIRM_IDENTITY: ConfirmIdentity,
}

export function LoadingState(
  state: TransactionUIProps['loadingState'] & { isInline?: boolean }
) {
  if (!state) return null

  // Inline loaders use a single component for progress + indeterminate
  if (state.isInline) {
    return <InlineLoading {...state} />
  }

  if (state.itemsInQueue !== undefined && state.itemsCompleted !== undefined) {
    return <Progress {...state} />
  }

  return <Indeterminate {...state} />
}

export function StandaloneLoadingState(
  state: TransactionUIProps['loadingState'] & {
    isInline?: false
  }
) {
  return (
    <div className="flex-1 flex flex-col justify-center items-center py-24 -mt-24">
      <div className="flex flex-col items-center h-48">
        {state.itemsInQueue !== undefined &&
        state.itemsCompleted !== undefined ? (
          <Progress {...state} />
        ) : (
          <Indeterminate {...state} />
        )}
      </div>
    </div>
  )
}

type TransactionUIProps = {
  transaction: NonNullable<inferQueryOutput<'transaction.dashboard.show'>>
  mode: ActionMode
  onStateChange?: (state: UI_STATE) => void
  onValidate?: () => void
} & Omit<ReturnType<typeof useTransaction>, 'uiRef'>

export default function TransactionUI({
  transaction,
  completedTransactionData,
  mode,
  state,
  ioCalls,
  currentIOCall,
  loadingState,
  onValidate,
  shouldUseAppendUi,
  didPreviousCallAcceptInput,
  shouldDisableTableTruncation,
}: TransactionUIProps) {
  const [showPlaceholderIndicator, setShowPlaceholderIndicator] =
    useState(false)
  const [initialInputGroupKey, setInitialGroupKey] = useState<
    string | undefined
  >()

  // If no render or loading calls made by action after short period
  // show a default loading indicator instead of a white screen
  useEffect(() => {
    if (state === 'IN_PROGRESS') {
      const timeout = setTimeout(() => {
        setShowPlaceholderIndicator(true)
      }, 3_000)
      return () => {
        clearTimeout(timeout)
      }
    } else {
      setShowPlaceholderIndicator(false)
    }
  }, [state])

  const inputGroupKey = currentIOCall?.inputGroupKey
  useEffect(() => {
    if (inputGroupKey) {
      setInitialGroupKey(key => key ?? inputGroupKey)
    }
  }, [inputGroupKey])

  const getActionUrl = useActionUrlBuilder(mode)

  const getUploadUrls = useUploadUrlFetcher({
    transactionId: transaction?.id,
    inputGroupKey: currentIOCall?.inputGroupKey,
  })

  const { setNavigationWarning } = useTransactionNavigationWarning()

  const callsToRender = shouldUseAppendUi
    ? ioCalls
    : currentIOCall
    ? [currentIOCall]
    : []

  const hasInteractiveElements = callsToRender.some(call =>
    call.elements.some(element => element.isInteractive)
  )

  if (state === 'CONNECTING') {
    return <PendingConnectionIndicator />
  }

  if (state === 'REDIRECTING') {
    return <PendingConnectionIndicator label="Redirecting..." />
  }

  if (loadingState && !shouldUseAppendUi) {
    return <StandaloneLoadingState {...loadingState} />
  }

  return (
    <ActionModeContext.Provider value={mode}>
      <div>
        <Suspense fallback={<PendingConnectionIndicator />}>
          <RenderContextProvider
            getActionUrl={getActionUrl}
            getUploadUrls={getUploadUrls}
            setNavigationWarning={setNavigationWarning}
          >
            <div>
              <div>
                {callsToRender.map((call, idx) => (
                  // not having a container element here is important because we use
                  // the :only selector in RenderIOCall to apply some styles in the append UI.
                  <RenderIOCall
                    // Super important! This is how we indicate whether something is a new page vs. an update
                    key={call.inputGroupKey}
                    className="my-4 first:mt-0"
                    inputGroupIndex={idx}
                    isCurrentCall={call.inputGroupKey === inputGroupKey}
                    shouldUseAppendUi={shouldUseAppendUi}
                    shouldDisableTableTruncation={shouldDisableTableTruncation}
                    didPreviousCallAcceptInput={didPreviousCallAcceptInput}
                    transaction={transaction}
                    initialInputGroupKey={initialInputGroupKey}
                    state={state}
                    {...call}
                    context="transaction"
                    onValidate={onValidate}
                    components={UnimplementedComponents}
                    mode={mode}
                    renderNextButton={
                      loadingState && shouldUseAppendUi ? false : undefined
                    }
                    renderPreviousInputStyle={
                      call.inputGroupKey !== inputGroupKey &&
                      hasInteractiveElements
                    }
                    disabled={
                      call.inputGroupKey !== inputGroupKey ||
                      state !== 'IN_PROGRESS'
                    }
                  />
                ))}
              </div>
              {/* it's important that this appears outside of the above div so loading states
                  don't affect the :only selector we use for previous IO call styling. */}
              {loadingState && shouldUseAppendUi && (
                <LoadingState {...loadingState} isInline />
              )}
            </div>
          </RenderContextProvider>
        </Suspense>
        {state === 'IN_PROGRESS' &&
          !loadingState &&
          !currentIOCall &&
          showPlaceholderIndicator && (
            <PendingConnectionIndicator label="Waiting to hear from action..." />
          )}
        {state === 'COMPLETED' && (
          <CompletionState
            className={shouldUseAppendUi ? 'mt-8' : 'mt-4'}
            transaction={{ ...transaction, ...completedTransactionData }}
            mode={mode}
            shouldAutoscroll={shouldUseAppendUi && didPreviousCallAcceptInput}
          />
        )}
      </div>
    </ActionModeContext.Provider>
  )
}
