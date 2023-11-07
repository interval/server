import IVSpinner from '~/components/IVSpinner'
import { ActionMode } from '~/utils/types'
import { UI_STATE } from '../../useTransaction'
import { useEffect, useReducer, useRef, useState } from 'react'
import classNames from 'classnames'
import { DisclosureContent, useDisclosureState } from 'reakit'
import { PageUIState } from '~/components/PageUI/usePage'

type ErrorStateProps = {
  mode: ActionMode
  state: UI_STATE | PageUIState
  onRefresh: () => void
}

export const ERROR_STATE_MESSAGES: Partial<
  Record<ErrorStateProps['state'], React.ReactNode>
> = {
  HOST_NOT_FOUND: (
    <p>
      Unable to connect to host. Check that your SDK server is running and try
      again.
    </p>
  ),
  HOST_DROPPED: <p>The connection to this action was lost.</p>,
  USURPED: (
    <p>
      This transaction was opened in another client, like another browser
      window. This client has been disconnected.
    </p>
  ),
  SERVER_DROPPED: <p>The connection to Interval was lost.</p>,
  INVALID_MESSAGE: (
    <>
      <p>
        Received invalid message from action. See the Logs pane below for more
        information.
      </p>
      <p>Please review your action definition and try again.</p>
    </>
  ),
  DROPPED: <p>The connection to this page was lost.</p>,
}

function ErrorMessage({ mode, state }: ErrorStateProps) {
  if (
    mode === 'console' &&
    (state === 'HOST_DROPPED' ||
      state === 'HOST_NOT_FOUND' ||
      state === 'DROPPED')
  ) {
    return <div>Waiting for your dev host to reconnect...</div>
  }

  if (
    state === 'HOST_DROPPED' ||
    state === 'HOST_NOT_FOUND' ||
    state === 'INVALID_MESSAGE' ||
    state === 'SERVER_DROPPED' ||
    state === 'USURPED' ||
    state === 'DROPPED'
  ) {
    return <div>{ERROR_STATE_MESSAGES[state] ?? null}</div>
  }

  if (state === 'IN_PROGRESS' || state === 'CONNECTED') {
    return <div>Connected!</div>
  }

  return null
}

interface AlertState {
  isVisible: boolean
  didDisconnect: boolean
  lastAction: 'DISCONNECT' | 'CONNECT' | 'RESET' | null
}

function alertStateReducer(
  prevState: AlertState,
  action: AlertState['lastAction']
): AlertState {
  // don't handle the same action twice; this will mess with prevState.didDisconnect
  if (action === prevState.lastAction) {
    return prevState
  }

  switch (action) {
    case 'DISCONNECT':
      return {
        isVisible: true,
        didDisconnect: true,
        lastAction: action,
      }
    case 'CONNECT':
      // only show the 'connected' alert upon reconnecting
      return {
        isVisible: prevState.didDisconnect,
        didDisconnect: false,
        lastAction: action,
      }
    case 'RESET':
    default:
      return {
        isVisible: false,
        didDisconnect: false,
        lastAction: action,
      }
  }
}

function useAlertState(state: ErrorStateProps['state']) {
  const hideTimeout = useRef<NodeJS.Timeout>()
  const [lastState, setLastState] = useState<ErrorStateProps['state']>(state)
  const [alertState, setAlertState] = useReducer(alertStateReducer, {
    isVisible: false,
    didDisconnect: false,
    lastAction: null,
  })

  useEffect(() => {
    // 'CONNECTING' is a transient state and we don't want it to affect the alert display
    if (state === 'CONNECTING') return
    setLastState(state)
  }, [state])

  useEffect(() => {
    if (
      state === 'HOST_DROPPED' ||
      state === 'HOST_NOT_FOUND' ||
      state === 'SERVER_DROPPED' ||
      state === 'USURPED' ||
      state === 'INVALID_MESSAGE' ||
      state === 'DROPPED'
    ) {
      setAlertState('DISCONNECT')
    } else if (state === 'IN_PROGRESS' || state === 'CONNECTED') {
      setAlertState('CONNECT')
    }
  }, [state])

  useEffect(() => {
    // clear previous timeout whenever alertState changes
    clearTimeout(hideTimeout.current)

    if (alertState.isVisible && !alertState.didDisconnect) {
      hideTimeout.current = setTimeout(() => {
        setAlertState('RESET')
      }, 1000)
    }
    return () => clearTimeout(hideTimeout.current)
  }, [alertState])

  return { ...alertState, state: lastState }
}

export default function ErrorState(props: ErrorStateProps) {
  const { state, isVisible } = useAlertState(props.state)

  const disclosure = useDisclosureState({ animated: 200 })

  {
    const { show, hide } = disclosure
    useEffect(() => {
      if (isVisible) {
        show()
      } else {
        hide()
      }
    }, [show, hide, isVisible])
  }

  const isConnected = state === 'IN_PROGRESS' || state === 'CONNECTED'

  return (
    <DisclosureContent
      {...disclosure}
      className="absolute bottom-0 right-0 p-2 z-20 opacity-0 translate-y-1 data-[enter]:opacity-100 data-[enter]:translate-y-0 data-[leave]:opacity-0 data-[leave]:translate-y-1 transition-all duration-150 ease-in-out"
    >
      <div
        className={classNames(
          'bg-opacity-90 text-white text-sm px-4 py-[14px] shadow-md rounded-md ease-in-out cursor-default transition-colors duration-150 flex items-start',
          {
            'bg-gray-700': !isConnected,
            'bg-green-600': isConnected,
          }
        )}
      >
        {!isConnected && (
          <div className="flex-none mr-3">
            <IVSpinner className="w-5 h-5" />
          </div>
        )}
        <div className="flex-1 space-y-2">
          <ErrorMessage {...props} state={state} />
          {(state === 'USURPED' || state === 'INVALID_MESSAGE') && (
            <button
              onClick={props.onRefresh}
              className="inline-flex border border-gray-400 px-3 py-1.5 text-sm rounded-md hover:bg-white hover:bg-opacity-5"
            >
              Reconnect
            </button>
          )}
        </div>
      </div>
    </DisclosureContent>
  )
}
