import classNames from 'classnames'

import { dateTimeFormatter } from '~/utils/formatters'
import { statusEnumToString } from '~/utils/text'
import { UseQueryResult } from 'react-query'
import { inferQueryOutput } from '~/utils/trpc'
import IconOnline from '~/icons/compiled/Online'
import IconOffline from '~/icons/compiled/Offline'
import IconOk from '~/icons/compiled/Ok'
import IconCancel from '~/icons/compiled/Cancel'
import IconRedirect from '~/icons/compiled/Redirect'

export interface TransactionHistoryProps {
  history: UseQueryResult<inferQueryOutput<'transaction.console.action.list'>>
  onNewTransaction: (id?: string) => void
  currentTransactionId?: string | null
}

export default function TransactionHistory({
  history,
  onNewTransaction,
  currentTransactionId,
}: TransactionHistoryProps) {
  return (
    <div>
      {history.isLoading ? (
        <></>
      ) : history.data && history.data.length ? (
        <ol className="flex-auto flex flex-col overflow-y-auto">
          {history.data.map(transaction => {
            const isAvailable = [
              'PENDING',
              'RUNNING',
              'COMPLETED',
              'AWAITING_INPUT',
            ].includes(transaction.status)

            const isCurrent = transaction.id === currentTransactionId

            let Icon
            let iconColor

            if (transaction.status === 'COMPLETED') {
              if (transaction.resultStatus === 'SUCCESS') {
                Icon = IconOk
                iconColor = 'text-green-600'
              } else if (transaction.resultStatus === 'REDIRECTED') {
                Icon = IconRedirect
                iconColor = 'text-gray-500'
              } else {
                Icon = IconCancel
                iconColor = 'text-red-500'
              }
            } else {
              Icon = isAvailable ? IconOnline : IconOffline
              iconColor = isAvailable ? 'text-green-600' : 'text-gray-500'
            }

            return (
              <li key={transaction.id}>
                <button
                  type="button"
                  className={classNames(
                    'px-4 py-3 w-full flex flex-col items-start text-sm text-gray-600',
                    {
                      'cursor-default': isAvailable && isCurrent,
                      'hover:bg-primary-50 hover:bg-opacity-25 cursor-pointer':
                        isAvailable && !isCurrent,
                      'bg-primary-50 bg-opacity-50': isCurrent,
                      'opacity-75': !isAvailable,
                    }
                  )}
                  onClick={() => onNewTransaction(transaction.id)}
                  disabled={!isAvailable || isCurrent}
                >
                  <span
                    className={classNames('text-left  ', {
                      'text-primary-500':
                        transaction.status === 'RUNNING' ||
                        transaction.status === 'AWAITING_INPUT',
                    })}
                  >
                    <Icon
                      className={classNames(
                        'inline-block w-4 h-4 mr-1.5 relative -top-px',
                        iconColor
                      )}
                    />
                    {statusEnumToString(
                      transaction.resultStatus ?? transaction.status
                    )}
                  </span>
                  <time
                    className="text-xs block mt-1 text-gray-400"
                    dateTime={transaction.createdAt.toISOString()}
                  >
                    {dateTimeFormatter.format(transaction.createdAt)}
                  </time>
                </button>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="p-4 text-sm">No history yet.</p>
      )}
    </div>
  )
}
