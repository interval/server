import {
  HTMLAttributes,
  createContext,
  useCallback,
  useEffect,
  useState,
  useMemo,
} from 'react'
import classNames from 'classnames'
import { useTabState, Tab, TabList, TabPanel } from 'reakit'
import TransactionHistory, {
  TransactionHistoryProps,
} from '~/components/TransactionHistory'
import IconCaretDown from '~/icons/compiled/CaretDown'
import { inferQueryOutput, trpc } from '~/utils/trpc'
import { ActionMode } from '~/utils/types'
import throttle from '~/utils/throttle'
import { UI_STATE } from '../../useTransaction'
import { NotificationPayload } from '~/utils/transactions'
import Logs from '../Logs'
import { useLocalStorage } from '~/utils/localStorage'
import Notifications from '../Notifications'
import { useIsSettingsPage } from '~/components/DashboardNav'
import { useDebounce } from 'use-debounce'

function TabBar({
  tabs,
  state,
  logsCount,
  notificationsCount,
  isExpanded,
  onToggleVisibility,
}: {
  tabs: { title: string }[]
  state: ReturnType<typeof useTabState>
  logsCount: number
  notificationsCount: number
  isExpanded: boolean
  onToggleVisibility: (title?: string) => void
}) {
  const tabClassName =
    'flex items-center px-4 uppercase font-medium py-3 tracking-wider text-xs focus:outline-none'

  const isActive = id => state.selectedId === id && isExpanded

  return (
    <div
      className="bg-white w-full flex items-center justify-between"
      data-pw-control-panel-expanded={isExpanded}
      data-pw-control-panel-selected={state.selectedId}
    >
      <TabList
        {...state}
        className="flex-1 flex items-start justify-start"
        aria-label="Control panel"
      >
        {tabs.map((tab, index) => (
          <Tab
            {...state}
            key={index}
            className={classNames(tabClassName, {
              'text-primary-500': isActive(tab.title),
              'text-gray-500 hover:opacity-60': !isActive(tab.title),
            })}
            id={tab.title}
            onClick={() => onToggleVisibility(tab.title)}
            data-pw-tab-id={tab.title}
          >
            {tab.title}
            {tab.title === 'Logs' && !isActive('Logs') && logsCount > 0 && (
              <span className="bg-gray-200 text-gray-500 font-medium px-2 text-[11px] rounded-full block -top-px relative ml-1">
                {logsCount}
              </span>
            )}
            {tab.title === 'Notifications' &&
              !isActive('Notifications') &&
              notificationsCount > 0 && (
                <span className="bg-gray-200 text-gray-500 font-medium px-2 text-[11px] rounded-full block -top-px relative ml-1">
                  {notificationsCount}
                </span>
              )}
          </Tab>
        ))}
      </TabList>
      <button
        className="p-3 text-gray-400 hover:opacity-60 w-full flex justify-end"
        onClick={() => onToggleVisibility()}
      >
        <IconCaretDown
          className={classNames('w-4 h-4', {
            'rotate-180': !isExpanded,
          })}
        />
      </button>
    </div>
  )
}

export interface ControlPanelProps {
  history?: Omit<TransactionHistoryProps, 'history'>
  logs?: string[]
  notifications: NotificationPayload[]
  state: UI_STATE
  transaction: inferQueryOutput<'transaction.dashboard.show'> | null
  mode: ActionMode
}

interface ControlPanelContextValue {
  state: ControlPanelProps | undefined
  setState: (props: ControlPanelProps) => void
  clearState: () => void
}

export const ControlPanelContext = createContext<ControlPanelContextValue>({
  state: undefined,
  setState: () => {
    /* */
  },
  clearState: () => {
    /* */
  },
})

const INITIAL_PANEL_HEIGHT = 200
const MIN_PANEL_HEIGHT = 100

function usePanelState(mode: ActionMode) {
  const localStorageKey = `IV_ACTION_CONTROL_PANEL:${mode}`
  const [isExpanded, setIsExpanded] = useLocalStorage(
    `${localStorageKey}:expanded`,
    false
  )
  const [height, setHeight] = useState(INITIAL_PANEL_HEIGHT)
  const [dragStartY, setDragStartY] = useState<number | null>(null)

  const mouseMoveHandler = useCallback<(event: MouseEvent) => void>(
    (event: MouseEvent) => {
      if (dragStartY === null) return

      setHeight(height + (dragStartY - event.clientY))
      setDragStartY(event.clientY)
    },
    // Intentionally using initial height value from when drag begun
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dragStartY]
  )

  // Doing this throttle in a separate memo call to appease eslint
  const handleMouseMove = useMemo(
    () => throttle(mouseMoveHandler, 50),
    [mouseMoveHandler]
  )

  const handleThumbMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation()
      if (!isExpanded) return
      document.body.classList.add('select-none', '!cursor-row-resize')
      setDragStartY(event.clientY)
    },
    [isExpanded]
  )

  const handleMouseUp = useCallback(() => {
    document.body.classList.remove('select-none', '!cursor-row-resize')
    // In case of overdrag and currently negavite height, reset to minimum
    setHeight(height => Math.max(MIN_PANEL_HEIGHT, height))
    setDragStartY(null)
  }, [setHeight])

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [handleMouseMove])

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      handleMouseUp() // Make sure we clean these up in case log goes wrong somehow
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseUp])

  return {
    isDragging: dragStartY !== null,
    isExpanded,
    setIsExpanded,
    height: isExpanded ? height : 0,
    setHeight,
    thumbProps: {
      onMouseDown: handleThumbMouseDown,
    },
  }
}

function DraggableThumb({
  isExpanded,
  ...props
}: HTMLAttributes<HTMLDivElement> & { isExpanded: boolean }) {
  return (
    <div
      className={classNames('absolute left-0 top-0 w-full', {
        'cursor-row-resize -mt-2 h-4': isExpanded,
      })}
      {...props}
    ></div>
  )
}

function useActionHistory(props: ControlPanelProps) {
  const transactionId = props.transaction?.id
  const actionSlug = props.transaction?.action.slug ?? ''

  // useDebounce prevents the History tab from popping in/out when the panel state is reset between transactions
  const [isHistoryEnabled] = useDebounce(
    !!actionSlug && props.mode === 'console',
    500
  )

  const history = trpc.useQuery(
    ['transaction.console.action.list', { actionSlug }],
    {
      enabled: isHistoryEnabled,
    }
  )

  const { refetch: refetchHistory } = history
  useEffect(() => {
    refetchHistory()
  }, [refetchHistory, transactionId])

  return { isHistoryEnabled, history }
}

export default function ControlPanel(props: ControlPanelProps) {
  const { isDragging, isExpanded, setIsExpanded, height, thumbProps } =
    usePanelState(props.mode)
  const tabState = useTabState({
    selectedId: 'Logs',
    manual: true,
  })
  const tabs = [{ title: 'Logs' }]

  const { isHistoryEnabled, history } = useActionHistory(props)

  if (props.notifications && props.mode === 'console') {
    tabs.push({ title: 'Notifications' })
  }

  if (isHistoryEnabled) {
    tabs.push({ title: 'History' })
  }

  const panelClassName = classNames('overflow-y-auto max-h-[80vh]', {
    invisible: !isExpanded,
  })
  const panelStyle = {
    height,
    minHeight: isExpanded ? MIN_PANEL_HEIGHT : undefined,
  }

  const isSettingsPage = useIsSettingsPage()

  if (isSettingsPage) {
    return null
  }

  return (
    <div
      className={classNames(
        'border-t border-gray-200 relative bottom-0 w-full z-10 bg-white pwa:pb-6',
        {
          'border-t-2 border-t-gray-300': isDragging,
        }
      )}
      data-pw-control-panel
    >
      <DraggableThumb isExpanded={isExpanded ?? false} {...thumbProps} />
      <TabBar
        tabs={tabs}
        state={tabState}
        logsCount={props.logs?.length ?? 0}
        notificationsCount={props.notifications?.length ?? 0}
        isExpanded={isExpanded ?? false}
        onToggleVisibility={title => {
          if (!isExpanded) {
            setIsExpanded(true)
          } else if (title === tabState.selectedId || !title) {
            setIsExpanded(false)
          }
        }}
      />
      <div>
        <TabPanel {...tabState} tabIndex={undefined}>
          <Logs
            logs={props.logs ?? []}
            isCompleted={props.state === 'COMPLETED'}
            className={panelClassName}
            style={panelStyle}
            mode={props.mode}
            isFocused={tabState.selectedId === 'Logs'}
          />
        </TabPanel>
        {isHistoryEnabled && history.data && props.history && (
          <TabPanel {...tabState} tabIndex={undefined}>
            <div className={panelClassName} style={panelStyle}>
              <TransactionHistory
                history={history}
                onNewTransaction={props.history.onNewTransaction}
                currentTransactionId={props.history.currentTransactionId}
              />
            </div>
          </TabPanel>
        )}
        {props.mode === 'console' && props.notifications && (
          <TabPanel {...tabState} tabIndex={undefined}>
            <Notifications
              className={panelClassName}
              style={panelStyle}
              notifications={props.notifications}
              isCompleted={props.state === 'COMPLETED'}
              isFocused={tabState.selectedId === 'Notifications'}
            />
          </TabPanel>
        )}
      </div>
    </div>
  )
}
