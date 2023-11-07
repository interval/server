import classNames from 'classnames'
import { useState, useEffect } from 'react'
import { UI_STATE } from '../TransactionUI/useTransaction'

export default function HostStatusIndicator({
  state,
}: {
  state: UI_STATE | null
}) {
  const [lastStatusStr, setLastStatusStr] = useState('')

  useEffect(() => {
    let statusStr = ''

    if (
      state === 'COMPLETED' ||
      state === 'USURPED' || // usurped is still online
      state === 'IN_PROGRESS'
    ) {
      statusStr = 'Connected'
    } else if (state === 'HOST_DROPPED') {
      statusStr = 'Reconnecting...'
    } else if (
      state === 'HOST_NOT_FOUND' ||
      state === 'SERVER_DROPPED' ||
      state === 'IDLE'
    ) {
      statusStr = 'Offline'
    } else if (state === 'CONNECTING') {
      statusStr = 'Connecting'
    }

    if (statusStr) setLastStatusStr(statusStr)
  }, [state])

  return (
    <div className="inline-flex items-center">
      <strong className="text-gray-700">Host status:&nbsp;</strong>
      <span className="font-normal">{lastStatusStr}</span>
      <span
        className={classNames('inline-block ml-1.5 w-1.5 h-1.5 rounded-full', {
          'bg-green-600':
            state === 'COMPLETED' ||
            state === 'USURPED' ||
            state === 'IN_PROGRESS',
          'bg-red-600':
            state === 'HOST_NOT_FOUND' || state === 'SERVER_DROPPED',
          'bg-gray-400': state === 'IDLE',
        })}
      ></span>
    </div>
  )
}
