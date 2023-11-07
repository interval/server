import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { useRegisterActions } from 'kbar'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Evt } from 'evt'
import { z } from 'zod'
import {
  ClientSchema,
  BackwardCompatibleLoadingState,
} from '@interval/sdk/dist/internalRpcSchema'
import { T_IO_RESPONSE } from '@interval/sdk/dist/ioSchema'
import { DuplexRPCHandlers } from '@interval/sdk/dist/classes/DuplexRPCClient'
import superjson from '~/utils/superjson'
import { inferQueryOutput, trpc } from '~/utils/trpc'
import { ActionMode } from '~/utils/types'
import {
  parseIOCall,
  PendingIOCall,
  NotificationPayload,
} from '~/utils/transactions'
import { OnRespond } from '~/components/RenderIOCall'
import { Transaction, TransactionStatus } from '@prisma/client'
import useWebSocketClient from './useWebSocketClient'
import { getActionUrl } from '~/utils/actions'
import usePrevious from '~/utils/usePrevious'
import { parseActionResult } from '~/utils/parseActionResult'
import { useIsFeatureEnabled } from '~/utils/useIsFeatureEnabled'
import { extractOrgSlug } from '~/utils/organization'
import { getCurrentPath } from '~/utils/url'
import useBackPath from '~/utils/useBackPath'
import { logger } from '~/utils/logger'

export type UI_STATE =
  | 'IDLE'
  | 'CONNECTING'
  | 'USURPED'
  | 'COMPLETED'
  | 'IN_PROGRESS'
  | 'HOST_DROPPED'
  | 'HOST_NOT_FOUND'
  | 'SERVER_DROPPED'
  | 'INVALID_MESSAGE'
  | 'REDIRECTING'

function getInitialUIState(stateInDb: TransactionStatus | undefined): UI_STATE {
  if (stateInDb === 'COMPLETED') {
    return 'COMPLETED'
  }

  if (stateInDb === 'HOST_CONNECTION_DROPPED') {
    return 'HOST_DROPPED'
  }

  return 'IDLE'
}

interface LogMessage {
  data: string | null
  index: number
  timestamp: number
}

interface IOCallsState {
  calls: Map<string, PendingIOCall>
  inputGroupKeys: string[]
  currentInputGroupKey: string | null
  isAwaitingInput: boolean
  loadingState: BackwardCompatibleLoadingState | null
  shouldUseAppendUi: boolean
  /**
   * Set this to true when the user completes a step that requires input.
   */
  didPreviousCallAcceptInput: boolean
}

const initialIOCallsState: IOCallsState = {
  calls: new Map(),
  inputGroupKeys: [],
  currentInputGroupKey: null,
  isAwaitingInput: false,
  loadingState: null,
  shouldUseAppendUi: false,
  didPreviousCallAcceptInput: false,
}

function ioCallReducer(
  state: IOCallsState,
  action:
    | { type: 'ADD'; payload: PendingIOCall }
    | { type: 'CONTINUE'; payload: { didPreviousCallAcceptInput?: boolean } }
    | { type: 'COMPLETE' }
    | { type: 'LOADING'; payload: BackwardCompatibleLoadingState }
    | { type: 'RESET' }
    | {
        type: 'UPDATE_APPEND_UI'
        payload: {
          shouldUseAppendUi?: boolean
        }
      }
) {
  switch (action.type) {
    case 'UPDATE_APPEND_UI':
      return {
        ...state,
        ...action.payload,
      }
    case 'ADD': {
      let {
        inputGroupKeys,
        currentInputGroupKey,
        isAwaitingInput,
        loadingState,
      } = state

      if (!state.calls.has(action.payload.inputGroupKey)) {
        inputGroupKeys = [...inputGroupKeys, action.payload.inputGroupKey]
        currentInputGroupKey = action.payload.inputGroupKey
        isAwaitingInput = state.shouldUseAppendUi
          ? action.payload.indexOfFirstInteractiveElement != null
          : true
        loadingState = null
      }

      const calls = new Map(state.calls)
      calls.set(action.payload.inputGroupKey, action.payload)

      return {
        ...state,
        calls,
        inputGroupKeys,
        currentInputGroupKey,
        isAwaitingInput,
        loadingState,
      }
    }
    case 'CONTINUE':
      return {
        ...state,
        isAwaitingInput: false,
        loadingState: null,
        // autoscroll to the next call if the last call accepted user input
        didPreviousCallAcceptInput:
          action.payload.didPreviousCallAcceptInput ?? false,
      }
    case 'COMPLETE':
      return {
        ...state,
        currentInputGroupKey: null,
        isAwaitingInput: false,
        loadingState: null,
      }
    case 'LOADING':
      if (
        state.loadingState &&
        state.loadingState.label === action.payload.label &&
        state.loadingState.title === action.payload.title &&
        state.loadingState.description === action.payload.description &&
        state.loadingState.itemsInQueue === action.payload.itemsInQueue &&
        state.loadingState.itemsCompleted === action.payload.itemsCompleted
      ) {
        // don't clobber if already set via peer
        return state
      }

      if (state.isAwaitingInput) {
        // don't clobber if already awaiting input
        return state
      }

      return {
        ...state,
        currentInputGroupKey: null,
        isAwaitingInput: false,
        loadingState: action.payload,
      }

    case 'RESET':
      return {
        ...state,
        ...initialIOCallsState,
      }
    default:
      throw new Error('Invalid action')
  }
}

export default function useTransaction({
  transaction,
  mode,
  updateTransaction,
}: {
  transaction: inferQueryOutput<'transaction.dashboard.show'> | null
  mode: ActionMode
  updateTransaction?: (results: Partial<Transaction>) => void
}) {
  const params = useParams()
  const { orgEnvSlug } = extractOrgSlug(params)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const backPath = useBackPath()
  const ctx = trpc.useContext()

  const isAppendUiDisabled = useIsFeatureEnabled(
    'TRANSACTION_LEGACY_NO_APPEND_UI'
  )
  const shouldUseAppendUi =
    !!transaction?.hostInstance?.sdkVersion &&
    transaction.hostInstance.sdkVersion >= '0.38.0' &&
    !isAppendUiDisabled

  const shouldDisableTableTruncation = useIsFeatureEnabled(
    'TABLE_TRUNCATION_DISABLED'
  )

  const retryTimeout = useRef<NodeJS.Timer | null>(null)
  const uiRef = useRef<HTMLDivElement>(null)
  const [logs, setLogs] = useState<LogMessage[]>([])
  const [notifications, setNotifications] = useState<NotificationPayload[]>([])
  const [completedTransactionData, setCompletedTransactionData] = useState<Pick<
    Transaction,
    'status' | 'resultStatus' | 'resultData' | 'completedAt'
  > | null>(null)

  const transactionId = transaction?.id
  const transactionStatus = transaction?.status

  // we override this setter below
  const [state, setUIStateInternal] = useState<UI_STATE>(() =>
    getInitialUIState(transactionStatus)
  )
  const [ioCalls, updateIOCalls] = useReducer(ioCallReducer, {
    ...initialIOCallsState,
    shouldUseAppendUi,
  })

  const isCompleted = state === 'COMPLETED'

  useEffect(() => {
    updateIOCalls({
      type: 'UPDATE_APPEND_UI',
      payload: { shouldUseAppendUi },
    })
  }, [shouldUseAppendUi])

  const isMounted = useRef(false)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    if (transactionStatus === 'COMPLETED') {
      setCompletedTransactionData(null)
    }
  }, [transactionStatus])

  const clearRetryTimeout = useCallback(() => {
    if (!retryTimeout.current) return
    clearTimeout(retryTimeout.current)
    retryTimeout.current = null
  }, [])

  const prevTransactionId = usePrevious(transactionId)

  useEffect(() => {
    // Don't run on first mount
    if (prevTransactionId && transactionId !== prevTransactionId) {
      setUIStateInternal(getInitialUIState(transactionStatus))
      updateIOCalls({ type: 'RESET' })
      setLogs([])
      setNotifications([])
      clearRetryTimeout()
      transactionHandlers.delete(prevTransactionId)
    }
    // We only want to reset this when the transaction changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId, prevTransactionId])

  const appendLog = useCallback(
    (log: Omit<LogMessage, 'index'> & { index?: number }) => {
      setLogs(prev => {
        if (log.index !== undefined) {
          const keys = new Set(prev.map(l => l.index))
          if (keys.has(log.index)) {
            return prev
          }
        }

        // If index missing (set from client), just append to end
        // Secondary timestamp sorting should ensure consistency
        const logs = [...prev, { ...log, index: log.index ?? 100_000 }]
        logs
          .sort((a, b) => a.timestamp - b.timestamp)
          .sort((a, b) => a.index - b.index)

        return logs
      })
    },
    []
  )

  // groups special state logic into a special `setState` function
  const setState = useCallback(
    (state: UI_STATE | ((state: UI_STATE) => UI_STATE)) => {
      if (!isMounted.current) return

      setUIStateInternal(prev => {
        // if in console, allow through host disconnection state to trigger reload on reconnect
        if (typeof state === 'function') {
          state = state(prev)
        }

        if (
          mode === 'console' &&
          (state === 'HOST_DROPPED' || state === 'HOST_NOT_FOUND')
        ) {
          if (state === 'HOST_NOT_FOUND' && prev === 'HOST_DROPPED') {
            return 'HOST_DROPPED'
          }

          return state
        }

        // once a transaction reaches `COMPLETED` the UI should never reflect a different state.
        if (prev === 'COMPLETED') return 'COMPLETED'

        // Prevents an error state flash when redirecting to external
        // URLs when the transaction connection is unmounting
        if (prev === 'REDIRECTING') return 'REDIRECTING'

        // if we try to reconnect after the host dropped and `CONNECT_TO_TRANSACTION_AS_CLIENT` returns false,
        // the host is online but hasn't reconnected yet. in that case, keep the `HOST_DROPPED` state.
        // we will let `retryInterval` continue until `CONNECT_TO_TRANSACTION_AS_CLIENT` returns true.
        if (state === 'HOST_NOT_FOUND' && prev === 'HOST_DROPPED')
          return 'HOST_DROPPED'

        return state
      })
    },
    [mode]
  )

  const handleRedirect = useCallback(
    async (props: z.input<ClientSchema['REDIRECT']['inputs']>) => {
      // prevent browser from warning about unsaved changes by waiting for REDIRECTING state to propagate
      setTimeout(() => {
        if ('url' in props) {
          window.location.assign(props.url)
        } else if (orgEnvSlug) {
          const url = getActionUrl({
            orgEnvSlug,
            mode,
            slug: props.route,
            params: props.params,
          })

          navigate(url, {
            state: {
              backPath: props.replace ? backPath : getCurrentPath(),
              shouldCreateNewTransaction: true,
            },
            replace: props.replace,
          })
        }
      }, 10)
    },
    [navigate, mode, orgEnvSlug, backPath]
  )

  const {
    onClose,
    rpc,
    connected,
    transactionHandlers,
    startTryingToReconnect,
  } = useWebSocketClient()

  const nodeEnv = trpc.useQuery(['app.node-env'])

  useRegisterActions(
    !nodeEnv.isLoading && nodeEnv.data !== 'production' && rpc
      ? [
          {
            id: 'development-only-request-drop-connection',
            name: 'Simulate Interval restart',
            subtitle: 'Available during Interval development only',
            perform: () => {
              rpc
                .send('__TEST_ONLY_REQUEST_DROP_CONNECTION', void 0)
                .catch(error => {
                  logger.error('Error sending development connection drop', {
                    error,
                  })
                })
            },
          },
        ]
      : [],
    [nodeEnv.isLoading, nodeEnv.data, rpc]
  )

  const [transactionEvtCtx] = useState(() => Evt.newCtx())

  /**
   * Registers this transaction with the WebSocket client
   *
   * @returns A function that unregisters the transaction, to be used for cleanup like in `useEffect`.
   */
  const register = useCallback(
    (onResponse?: (isConnected: boolean) => void) => {
      if (!transactionId) return
      if (!connected) return

      const handleClose = () => {
        setState('SERVER_DROPPED')
      }

      onClose.detach(transactionEvtCtx)
      onClose.attach(transactionEvtCtx, handleClose)

      const handlers: DuplexRPCHandlers<ClientSchema> = {
        CLIENT_USURPED: async () => {
          setState('USURPED')
        },
        HOST_CLOSED_UNEXPECTEDLY: async () => {
          setState('HOST_DROPPED')
        },
        HOST_RECONNECTED: async () => {
          setState('IN_PROGRESS')
        },
        TRANSACTION_COMPLETED: async inputs => {
          if (inputs.result && updateTransaction) {
            const resultData = parseActionResult(inputs.result)
            updateTransaction({
              status: 'COMPLETED',
              resultData: resultData.data,
              resultStatus: inputs.resultStatus,
              completedAt: new Date(),
            })
          }
          setState('COMPLETED')
          updateIOCalls({ type: 'COMPLETE' })
        },
        RENDER_PAGE: async () => {
          return false
        },
        RENDER: async ({ toRender }) => {
          try {
            const {
              id,
              elements,
              indexOfFirstInteractiveElement,
              inputGroupKey,
              validationErrorMessage,
              choiceButtons,
            } = parseIOCall(toRender)

            const nextCall = {
              id,
              elements,
              inputGroupKey,
              indexOfFirstInteractiveElement,
              validationErrorMessage,
              choiceButtons,
              onRespond: async ({
                response: values,
                kind,
                choice,
              }: OnRespond) => {
                const { json, meta } = superjson.serialize(values)

                const ioResponse: T_IO_RESPONSE = {
                  id,
                  transactionId,
                  inputGroupKey,
                  values: json as any[],
                  valuesMeta: meta,
                  choice,
                  kind,
                }

                try {
                  if (rpc) {
                    const sendViaServer = async () => {
                      try {
                        await rpc.send('RESPOND_TO_IO_CALL', {
                          transactionId,
                          ioResponse: JSON.stringify(ioResponse),
                        })
                      } catch (error) {
                        logger.error('Failed sending RESPOND_TO_IO_CALL', {
                          transactionId,
                          error,
                        })
                        startTryingToReconnect()
                      }
                    }
                    await sendViaServer()
                  }

                  if (kind === 'RETURN') {
                    // clear loading state again in case stragglers came since last RENDER
                    updateIOCalls({
                      type: 'CONTINUE',
                      payload: {
                        didPreviousCallAcceptInput: elements.some(
                          e => e.isInteractive
                        ),
                      },
                    })
                  }
                } catch (error) {
                  logger.error('Failed sending IO response', { error })
                  startTryingToReconnect()
                }
              },
            }

            setState('IN_PROGRESS')
            updateIOCalls({ type: 'ADD', payload: nextCall })

            return true
          } catch (error) {
            logger.error('Received invalid IO call', { error })

            // Intentionally not sending this to log services
            console.error({ toRender })

            setState('INVALID_MESSAGE')
            appendLog({
              data: `Received invalid IO call: ${toRender}`,
              timestamp: new Date().getTime(),
            })
            appendLog({
              data: String(error),
              timestamp: new Date().getTime(),
            })
            return false
          }
        },
        LOADING_STATE: async loadingState => {
          setState('IN_PROGRESS')
          updateIOCalls({ type: 'LOADING', payload: loadingState })
          return true
        },
        LOG: async log => {
          appendLog(log)
          return true
        },
        NOTIFY: async data => {
          setNotifications(prev => {
            return [...prev, data]
          })
          return true
        },
        REDIRECT: async props => {
          if (rpc) {
            setState('REDIRECTING')
            handleRedirect(props)
          }
          return true
        },
      }

      transactionHandlers.set(transactionId, handlers)

      const setup = () =>
        new Promise<boolean>((resolve, reject) => {
          // set to CONNECTING on first connection, but not on subsequent reconnects.
          // helps prevent flashing UI states as we attempt to reconnect.
          setState(prev => (prev === 'IDLE' ? 'CONNECTING' : prev))

          if (rpc) {
            const params = Object.fromEntries(searchParams)

            rpc
              .send('CONNECT_TO_TRANSACTION_AS_CLIENT', {
                transactionId,
                params,
              })
              .then(resolve)
              .catch(reject)
          }
        })

      if (!isCompleted) {
        setup()
          .then(isConnected => {
            if (isConnected) {
              setUIStateInternal(prev => {
                if (prev === 'COMPLETED') return prev

                return 'IN_PROGRESS'
              })
            } else {
              setState('HOST_NOT_FOUND')
            }

            onResponse?.(isConnected)
          })
          .catch(error => {
            logger.error('Failed connecting to transaction, reconnecting...', {
              error,
            })
            startTryingToReconnect()
          })
      }

      return () => {
        onClose.detach(transactionEvtCtx)

        if (retryTimeout.current) {
          clearTimeout(retryTimeout.current)
          retryTimeout.current = null
        }

        transactionHandlers.delete(transactionId)
      }
    },
    [
      logger,
      transactionEvtCtx,
      searchParams,
      transactionId,
      setState,
      appendLog,
      rpc,
      transactionHandlers,
      onClose,
      isCompleted,
      connected,
      startTryingToReconnect,
      handleRedirect,
      updateTransaction,
    ]
  )

  const shouldUseAppendUiRef = useRef(shouldUseAppendUi)
  useEffect(() => {
    shouldUseAppendUiRef.current = shouldUseAppendUi
  }, [shouldUseAppendUi])

  const rpcRef = useRef(rpc)
  useEffect(() => {
    rpcRef.current = rpc
  }, [rpc])

  useEffect(() => {
    return () => {
      if (transactionId && shouldUseAppendUiRef.current && rpcRef.current) {
        rpcRef.current
          .send('LEAVE_TRANSACTION', {
            transactionId,
          })
          .catch(err => {
            console.error('Failed sending LEAVE_TRANSACTION call', err)
          })
      }
    }
  }, [transactionId, transaction?.action.backgroundable, logger])

  const handleResponse = useCallback(
    (isConnected: boolean) => {
      if (isConnected) {
        clearRetryTimeout()
      } else {
        retryTimeout.current = setTimeout(() => {
          register(handleResponse)
        }, 1000)
      }
    },
    [clearRetryTimeout, register]
  )

  // auto-reconnect when host drops
  useEffect(() => {
    if (!rpc) return

    if (state === 'IN_PROGRESS' || state === 'COMPLETED') {
      clearRetryTimeout()
    }

    if (retryTimeout.current) return

    if (
      state === 'HOST_DROPPED' ||
      state === 'HOST_NOT_FOUND' ||
      state === 'SERVER_DROPPED'
    ) {
      register(handleResponse)
    }
  }, [rpc, state, register, clearRetryTimeout, handleResponse])

  // Refetch transaction upon completion to get result status & object from db
  const { refetchQueries, setQueryData } = ctx
  useEffect(() => {
    if (mode === 'live' && state === 'COMPLETED' && transactionId) {
      // Optimistically set this so transaction completion page
      // knows immediately that it is complete before refetching
      transaction.status = 'COMPLETED'

      refetchQueries(['transaction.dashboard.show', { transactionId }])
    }
    // We don't want to rerun this when transaction refetches
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, state, refetchQueries, setQueryData, transactionId])

  // store incoming logs from a transaction, reset to an empty array if missing
  useEffect(() => {
    // for in browser demo logs aren't stored on the transaction so don't clear
    // them out when the transaction changes
    if (!rpc) return
    setLogs(
      transaction?.logs.map(l => ({
        data: l.data,
        index: l.index,
        timestamp: l.createdAt.valueOf(),
      })) ?? []
    )
  }, [transaction, rpc])

  // on submit, get the first component with an error on the form and scroll to it
  const onValidate = useCallback(() => {
    setTimeout(() => {
      if (!uiRef.current) return

      const errors = uiRef.current.querySelectorAll('.has-error')

      const innerScrollTop =
        (uiRef.current?.scrollTop ?? 0) - (uiRef.current?.offsetTop ?? 0)

      const values = Array.from(errors)
        .map(el => ({
          el,
          top: el.getBoundingClientRect().top + innerScrollTop,
        }))
        .sort((a, b) => a.top - b.top)

      // 8px = leave a gap between the element and the top of the window
      const scrollTo = (values[0]?.top ?? 0) - 8

      uiRef.current.scrollTo({
        top: scrollTo,
        behavior: 'smooth',
      })

      if (values[0]) {
        focusInputInField(values[0].el)
      }
    }, 100)
  }, [])

  const logLines = useMemo(() => logs.map(l => l.data ?? ''), [logs])

  const wrappedRegister = useCallback(
    () => register(handleResponse),
    [register, handleResponse]
  )

  const currentIOCall = ioCalls.currentInputGroupKey
    ? ioCalls.calls.get(ioCalls.currentInputGroupKey)
    : undefined

  return {
    state,
    setState,
    register: wrappedRegister,
    ioCalls: ioCalls.inputGroupKeys.map(key =>
      ioCalls.calls.get(key)
    ) as PendingIOCall[],
    currentIOCall,
    loadingState: ioCalls.loadingState,
    didPreviousCallAcceptInput: ioCalls.didPreviousCallAcceptInput,
    completedTransactionData,
    setCompletedTransactionData,
    logLines,
    notifications,
    uiRef,
    onValidate,
    shouldUseAppendUi,
    shouldDisableTableTruncation,
  }
}

function focusInputInField(el: Element) {
  const input = el.querySelector(
    '.form-input, .form-select'
  ) as HTMLElement | null
  if (input && 'focus' in input) {
    input.focus()
  }
}
