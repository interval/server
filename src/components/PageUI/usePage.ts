import { useCallback, useRef, useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { T_IO_RESPONSE } from '@interval/sdk/dist/ioSchema'
import {
  ClientSchema,
  WSServerSchema,
  BackwardCompatibleLoadingState,
} from '@interval/sdk/dist/internalRpcSchema'
import { LayoutSchema, LAYOUT_SCHEMA } from '@interval/sdk/dist/classes/Layout'
import { DuplexRPCHandlers } from '@interval/sdk/dist/classes/DuplexRPCClient'
import superjson from '~/utils/superjson'
import { ActionMode } from '~/utils/types'
import useWebSocketClient from '../TransactionUI/useWebSocketClient'
import { PendingIOCall } from '~/utils/transactions'
import { trpc } from '~/utils/trpc'
import { useDashboardOptional } from '../DashboardContext'
import { useStateFlagEnabled } from '~/utils/navigationHooks'
import usePrevious from '~/utils/usePrevious'
import { v4 } from 'uuid'
import { getActionUrl } from '~/utils/actions'
import { extractOrgSlug } from '~/utils/extractOrgSlug'
import { getCurrentPath } from '~/utils/url'
import useBackPath from '~/utils/useBackPath'
import { logger } from '~/utils/logger'

export type PageUIState =
  | 'IDLE'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'REDIRECTING'
  | 'DROPPED'
type RequestPageResponse = z.infer<WSServerSchema['REQUEST_PAGE']['returns']>

export default function usePage({
  pageSlug,
  mode,
}: {
  pageSlug: string
  mode: ActionMode
}) {
  const params = useParams()
  const { orgEnvSlug } = extractOrgSlug(params)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const backPath = useBackPath()
  const dashboardContext = useDashboardOptional()
  const pageKeyRef = useRef<string>(v4())
  const [uiState, setUiState] = useState<PageUIState>('IDLE')
  const [loadingState, setLoadingState] =
    useState<BackwardCompatibleLoadingState | null>(null)
  const [state, setState] = useState<{
    layout: LayoutSchema | null
    hostInstanceId: string
    pageSlug: string
  } | null>(null)
  const app = trpc.useQuery([
    'actionGroup.one',
    {
      groupSlug: pageSlug,
      mode,
    },
  ])

  const retryTimeout = useRef<number | null>(null)
  const uiRef = useRef<HTMLDivElement>(null)

  const prevPageSlug = usePrevious(pageSlug)
  const prevSearchParams = usePrevious(searchParams)

  if (
    !pageKeyRef.current ||
    (pageSlug && prevPageSlug && pageSlug !== prevPageSlug) ||
    searchParams !== prevSearchParams
  ) {
    pageKeyRef.current = v4()
  }

  const {
    rpc,
    connected,
    transactionHandlers,
    startTryingToReconnect,
    reconnectInterval,
  } = useWebSocketClient()

  const prevPageKey = usePrevious(pageKeyRef.current)

  useEffect(() => {
    if (prevPageKey && prevPageKey !== pageKeyRef.current) {
      transactionHandlers.delete(prevPageKey)
    }
  }, [prevPageKey, transactionHandlers])

  const children = state?.layout?.children
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

  const registerState = useRef({
    logger,
    handleRedirect,
    startTryingToReconnect,
  })

  useEffect(() => {
    registerState.current = {
      logger,
      handleRedirect,
      startTryingToReconnect,
    }
  }, [logger, handleRedirect, startTryingToReconnect])

  const register = useCallback(
    (onResponse?: (response: RequestPageResponse) => void) => {
      if (!connected) return

      const pageKey = pageKeyRef.current

      setUiState('CONNECTING')

      const handlers: DuplexRPCHandlers<ClientSchema> = {
        RENDER_PAGE: async ({ page, hostInstanceId }) => {
          setUiState('CONNECTED')
          if (!page) {
            setState({
              layout: null,
              hostInstanceId,
              pageSlug,
            })
            return true
          }

          try {
            const parsedLayout = LAYOUT_SCHEMA.parse(JSON.parse(page))
            setState({
              layout: parsedLayout,
              hostInstanceId,
              pageSlug,
            })
          } catch (error) {
            registerState.current.logger.error(
              'RENDER_PAGE: Failed parsing page',
              { error }
            )
            return false
          }

          return true
        },

        CLIENT_USURPED: async () => {
          //
        },
        HOST_CLOSED_UNEXPECTEDLY: async () => {
          // Don't set disconnected state here in pages, we want them to only reconnect after interaction
          // to prevent effective DoSing as soon as a new host becomes active/reconnects
        },
        HOST_RECONNECTED: async ({ transactionId: pageKey }) => {
          pageKeyRef.current = pageKey
          setUiState('CONNECTED')
        },
        TRANSACTION_COMPLETED: async () => {
          //
        },
        RENDER: async () => {
          return false
        },
        LOADING_STATE: async loadingState => {
          setUiState('CONNECTED')
          setLoadingState(loadingState)
          return true
        },
        LOG: async () => {
          return false
        },
        NOTIFY: async () => {
          return false
        },
        REDIRECT: async props => {
          setUiState('REDIRECTING')
          registerState.current.handleRedirect(props)

          return true
        },
      }

      const setup = () =>
        new Promise<RequestPageResponse>((resolve, reject) => {
          transactionHandlers.set(pageKey, handlers)

          const sendRequestViaServer = () => {
            // Need to send first request via server, because we don't know which hostInstance to connect to yet
            if (rpc && dashboardContext?.organizationEnvironment.id) {
              rpc
                .send('REQUEST_PAGE', {
                  pageSlug,
                  actionMode: mode,
                  organizationEnvironmentId:
                    dashboardContext.organizationEnvironment.id,
                  params: Object.fromEntries(searchParams),
                  pageKey,
                })
                .then(resolve)
                .catch(err => {
                  reject(err)
                })
            }
          }

          sendRequestViaServer()
        })

      setup()
        .then(response => {
          if (response.type === 'SUCCESS') {
            setUiState('CONNECTED')
          }

          onResponse?.(response)
        })
        .catch(error => {
          registerState.current.logger.error(
            'Failed connecting to app, reconnecting...',
            { error }
          )
          if (retryTimeout.current) {
            clearTimeout(retryTimeout.current)
            retryTimeout.current = null
          }
          registerState.current.startTryingToReconnect()
        })

      return () => {
        if (retryTimeout.current) {
          clearTimeout(retryTimeout.current)
          retryTimeout.current = null
        }

        transactionHandlers.delete(pageKey)

        if (rpc) {
          rpc
            .send('LEAVE_PAGE', {
              pageKey,
            })
            .catch(error => {
              registerState.current.logger.warn(
                'Failed sending LEAVE_PAGE call',
                { error }
              )
            })
        }
      }
    },
    [
      searchParams,
      mode,
      pageSlug,
      rpc,
      transactionHandlers,
      connected,
      dashboardContext?.organizationEnvironment.id,
    ]
  )

  const clearRetryTimeout = useCallback(() => {
    if (!retryTimeout.current) return
    clearTimeout(retryTimeout.current)
    retryTimeout.current = null
  }, [])

  const handleResponse = useCallback(
    (response: RequestPageResponse) => {
      clearRetryTimeout()

      if (response.type !== 'SUCCESS') {
        // set new page key
        pageKeyRef.current = v4()
        // try again after a short delay
        retryTimeout.current = window.setTimeout(() => {
          register(handleResponse)
        }, 1000)
      }
    },
    [clearRetryTimeout, register]
  )

  const wrappedRegister = useCallback(
    () => register(handleResponse),
    [register, handleResponse]
  )

  const onRespond: PendingIOCall['onRespond'] = useCallback(
    async ({ response: values, kind }) => {
      if (!children || !pageKeyRef.current) return
      const { json, meta } = superjson.serialize(values)

      const ioResponse: T_IO_RESPONSE = {
        ...children,
        transactionId: pageKeyRef.current,
        values: json as any[],
        valuesMeta: meta,
        kind,
      }

      const sendResponseViaServer = async () => {
        try {
          if (rpc) {
            const response = await rpc.send('RESPOND_TO_IO_CALL', {
              transactionId: pageKeyRef.current as string,
              ioResponse: JSON.stringify(ioResponse),
            })

            if (!response) {
              setUiState('DROPPED')

              if (retryTimeout.current) {
                clearTimeout(retryTimeout.current)
                retryTimeout.current = null
              }

              if (reconnectInterval.current) return

              // Connection works but failed responding, reopen page with new key
              pageKeyRef.current = v4()
              retryTimeout.current = window.setTimeout(wrappedRegister, 1000)
            }
          }
        } catch (error) {
          logger.error('Failed sending IO response', { error })
          startTryingToReconnect()
        }
      }

      sendResponseViaServer()
    },
    [
      children,
      rpc,
      startTryingToReconnect,
      reconnectInterval,
      logger,
      wrappedRegister,
    ]
  )

  // Keep trying to reconnect if host not found
  useEffect(() => {
    if (state) {
      clearRetryTimeout()
    }

    if (retryTimeout.current) return
  }, [state, register, clearRetryTimeout, handleResponse, uiState])

  // clear state between page changes
  useEffect(() => {
    setState(null)
    setLoadingState(null)
    setUiState('IDLE')
  }, [pageSlug])

  useStateFlagEnabled(
    'shouldCreateNewTransaction',
    () => {
      if (searchParams === prevSearchParams) {
        pageKeyRef.current = v4()
        register(handleResponse)
      }
    },
    [register, searchParams, prevSearchParams, handleResponse]
  )

  return {
    ...(state ?? {}),
    layout: state
      ? state.layout
        ? {
            ...state.layout,
            title: state.layout?.title ?? app.data?.name,
          }
        : null
      : undefined,
    loadingState: state?.layout ? undefined : loadingState,
    app: app.data,
    pageKey: pageKeyRef.current,
    register: wrappedRegister,
    uiRef,
    onRespond,
    uiState,
  }
}
