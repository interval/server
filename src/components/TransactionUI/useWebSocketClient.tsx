import {
  useContext,
  createContext,
  useState,
  useCallback,
  useRef,
  RefObject,
  useEffect,
} from 'react'
import { z } from 'zod'
import {
  wsServerSchema,
  clientSchema,
  ClientSchema,
  WSServerSchema,
} from '@interval/sdk/dist/internalRpcSchema'
import ISocket from '@interval/sdk/dist/classes/ISocket'
import {
  DuplexRPCClient,
  DuplexRPCHandlers,
} from '@interval/sdk/dist/classes/DuplexRPCClient'
import { useDashboardOptional } from '../DashboardContext'
import usePrevious from '~/utils/usePrevious'
import { Evt } from 'evt'
import { CLIENT_ISOCKET_ID_SEARCH_PARAM_KEY } from '~/utils/isomorphicConsts'
import { logger } from '~/utils/logger'
import { v4 } from 'uuid'

const RECONNECT_INTERVAL_MS = 2000

function getWebSocketUrl(id?: string) {
  const u = new URL(window.location.toString())
  u.protocol = u.protocol.replace('http', 'ws')
  u.port = '3002'
  u.pathname = '/'
  if (id) {
    u.searchParams.set(CLIENT_ISOCKET_ID_SEARCH_PARAM_KEY, id)
  }
  return u.toString()
}

export interface WebSocketClientContextValue {
  ws: ISocket | null
  rpc: DuplexRPCClient<WSServerSchema, ClientSchema> | null
  onClose: Evt<[number, string]>
  close: () => void
  connected: boolean
  transactionHandlers: Map<string, DuplexRPCHandlers<ClientSchema>>
  startTryingToReconnect: () => void
  reconnectInterval: RefObject<number | null>
}

export const WebSocketClientContext = createContext<
  WebSocketClientContextValue | undefined
>(undefined)

export function WebSocketClientProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const dashboardContext = useDashboardOptional()
  const userSession = dashboardContext ? dashboardContext.userSession : null
  const reconnectInterval = useRef<number | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [consecutiveErrorCount, setConsecutiveErrorCount] = useState(0)
  const [ws, setWs] = useState<ISocket | null>(() => {
    const id = v4()
    // send id to wss so same clientId is shared on both ends
    // necessary for peer clientId to be same as ws-based clientId
    return new ISocket(new WebSocket(getWebSocketUrl(id)), { id })
  })
  const [onClose, setOnClose] = useState<Evt<[number, string]>>(
    () => ws?.onClose ?? new Evt<[number, string]>()
  )
  const [transactionHandlers] = useState(
    () => new Map<string, DuplexRPCHandlers<ClientSchema>>()
  )

  const getHandlers = useCallback(() => {
    const handlers: Partial<DuplexRPCHandlers<ClientSchema>> = {}

    for (const event of Object.keys(clientSchema)) {
      // Don't redefine global handlers above
      if (!(event in handlers)) {
        const clientEvent = event as keyof ClientSchema
        handlers[clientEvent] = async (
          props: z.infer<ClientSchema[typeof clientEvent]['inputs']>
        ) => {
          setConsecutiveErrorCount(0)
          const key =
            'transactionId' in props ? props.transactionId : props.pageKey

          const handlers = transactionHandlers.get(key)

          if (!handlers) {
            logger.error('useWebSocketClient: No handlers found for key', {
              key,
              props,
            })

            return
          }

          return handlers[event](props)
        }
      }
    }

    return handlers as DuplexRPCHandlers<ClientSchema>
    // Seemingly kind of a circular dependency here, because rpc
    // is used within, but rpc should be initialized by the time
    // the callback is called, and it never changes, so it doesn't
    // really need to be in the hook dependency array.
    //
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionHandlers])

  const [rpc] = useState<DuplexRPCClient<WSServerSchema, ClientSchema> | null>(
    () => {
      if (ws === null) return null
      return new DuplexRPCClient({
        communicator: ws,
        canCall: wsServerSchema,
        canRespondTo: clientSchema,
        handlers: getHandlers(),
      })
    }
  )

  const mounted = useRef(true)

  useEffect(
    () => () => {
      mounted.current = false
    },
    []
  )

  const close = useCallback(() => {
    if (ws === null) return
    logger.info('🔌 ws: closing')
    ws.close()
  }, [ws, logger])

  const reconnect = useCallback(() => {
    if (ws === null) return
    setConsecutiveErrorCount(0)
    setIsAuthenticated(false)
    ws.onOpen.detach()
    ws.onAuthenticated.detach()
    ws.onClose.detach()
    ws.onError.detach()
    ws.close()

    const newWs = new ISocket(new WebSocket(getWebSocketUrl(ws.id)), {
      id: ws.id,
    })
    newWs.onAuthenticated.attach(() => {
      if (reconnectInterval.current) {
        clearInterval(reconnectInterval.current)
        reconnectInterval.current = null
      }
    })
    setWs(newWs)
    setOnClose(newWs.onClose)
    if (rpc) {
      rpc.setCommunicator(newWs)
    }
  }, [ws, rpc])

  const startTryingToReconnect = useCallback(() => {
    if (reconnectInterval.current) return

    logger.info('🔌 ws: connection lost, attempting to reconnect...')

    reconnectInterval.current = window.setInterval(() => {
      reconnect()
    }, RECONNECT_INTERVAL_MS)
  }, [reconnect, logger])

  const readyState = ws?.readyState
  useEffect(() => {
    if (consecutiveErrorCount >= 3 || readyState === WebSocket.CLOSED) {
      startTryingToReconnect()
    }
  }, [consecutiveErrorCount, readyState, startTryingToReconnect])

  useEffect(() => {
    if (ws === null || rpc === null) return

    ws.onOpen.attach(() => {
      logger.info('🔌 ws: open')
    })

    ws.onAuthenticated.attach(async () => {
      logger.info('🔌 ws: authenticated')

      setIsAuthenticated(true)

      if (!mounted.current) return
      const initialized = await rpc.send('INITIALIZE_CLIENT', undefined)

      if (!mounted.current) return

      if (!initialized || !ws?.isOpen) {
        logger.info('🔌 ws: failed to initialize client')
        startTryingToReconnect()
        return
      }

      logger.info('🔌 ws: connected')
    })

    ws.onClose.attach(() => {
      logger.info('🔌 ws: close')

      if (!mounted.current) return

      startTryingToReconnect()
    })

    ws.onError.attach(error => {
      logger.error('🔌 ws: received error', { error })
      setConsecutiveErrorCount(prev => prev + 1)
    })

    logger.info('🔌 ws: opening connection')

    ws.connect().catch(error => {
      logger.info('🔌 ws: failed to establish connection', { error })
      startTryingToReconnect()
    })
  }, [ws, rpc, startTryingToReconnect, logger])

  const prevUserSession = usePrevious(userSession)

  useEffect(() => {
    if (
      ws?.isOpen &&
      (userSession?.meId !== prevUserSession?.meId ||
        userSession?.orgId !== prevUserSession?.orgId ||
        userSession?.orgEnvId !== prevUserSession?.orgEnvId)
    ) {
      startTryingToReconnect()
    }
  }, [ws?.isOpen, userSession, prevUserSession, startTryingToReconnect])

  return (
    <WebSocketClientContext.Provider
      value={{
        ws,
        rpc,
        onClose,
        close,
        connected: (ws?.isOpen ?? false) && isAuthenticated,
        transactionHandlers,
        startTryingToReconnect,
        reconnectInterval,
      }}
    >
      {children}
    </WebSocketClientContext.Provider>
  )
}

export default function useWebSocketClient() {
  const context = useContext(WebSocketClientContext)

  if (!context) {
    throw new Error(
      'useWebSocketClient must be used within a WebSocketClientContextProvider'
    )
  }

  return context
}
