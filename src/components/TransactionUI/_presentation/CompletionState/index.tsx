import { useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { JSONValue, SuperJSONResult } from 'superjson/dist/types'
import superjson from '~/utils/superjson'
import { dateTimeFormatter } from '~/utils/formatters'
import { inferQueryOutput } from '~/utils/trpc'
import ResultRenderer from '../Result'
import IconOk from '~/icons/compiled/Ok'
import IconCancel from '~/icons/compiled/Cancel'
import { statusEnumToString } from '~/utils/text'
import { ActionMode } from '~/utils/types'
import { useParams } from 'react-router-dom'
import { extractOrgSlug } from '~/utils/extractOrgSlug'
import IconRedirect from '~/icons/compiled/Redirect'
import useTransactionAutoScroll from '~/utils/useTransactionAutoScroll'

export default function CompletionState({
  className,
  transaction,
  mode,
  shouldAutoscroll = false,
}: {
  className?: string
  transaction: NonNullable<inferQueryOutput<'transaction.dashboard.show'>>
  mode: ActionMode
  shouldAutoscroll?: boolean
}) {
  const location = useLocation()
  const params = useParams()
  const { orgEnvSlug } = extractOrgSlug(params)
  const ref = useRef<HTMLDivElement>(null)

  const { resultData, resultDataMeta } = transaction
  const result: JSONValue = useMemo(() => {
    if (resultDataMeta) {
      return superjson.deserialize({
        json: resultData,
        meta: resultDataMeta,
      } as SuperJSONResult)
    }

    return resultData
  }, [resultData, resultDataMeta])

  const shareLink =
    orgEnvSlug &&
    !location.pathname.startsWith(`/dashboard/${orgEnvSlug}/transactions/`)
      ? `${window.location.protocol}//${window.location.host}/dashboard/${orgEnvSlug}/transactions/${transaction.id}`
      : undefined

  useTransactionAutoScroll({
    enabled: shouldAutoscroll,
    ref,
  })

  return (
    <div className={className} ref={ref}>
      {mode === 'console' && transaction.action.slug === 'hello_world' && (
        <div className="mb-4 p-4 border rounded bg-gray-50">
          <h3
            className="text-sm font-medium text-gray-900"
            data-test-id="result-type"
          >
            🎉 Nice work!
          </h3>
          <p className="mt-0.5 text-sm text-gray-500">
            Check out{' '}
            <a
              href="/examples"
              className="text-primary-500 font-medium hover:opacity-60"
            >
              our collection of example tools
            </a>{' '}
            to learn more about what you can build with Interval.
          </p>
        </div>
      )}
      <div className="sm:flex justify-between items-center mb-2">
        <div className="flex flex-1 items-center mb-4 sm:mb-0">
          <div className="flex-none mr-2">
            {transaction.resultStatus === 'SUCCESS' && (
              <IconOk className="w-10 h-10 text-gray-400" />
            )}
            {transaction.resultStatus === 'REDIRECTED' && (
              <IconRedirect className="w-10 h-10 text-gray-400" />
            )}
            {transaction.resultStatus === 'FAILURE' && (
              <IconCancel className="w-10 h-10 text-red-600" />
            )}
            {transaction.resultStatus === 'CANCELED' && (
              <IconCancel className="w-10 h-10 text-gray-400" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500">
              <span
                className="mb-0.5 text-sm font-medium text-gray-900"
                data-test-id="result-type"
              >
                {statusEnumToString(
                  transaction.resultStatus ?? transaction.status
                )}
              </span>
              {transaction.completedAt && (
                <> at {dateTimeFormatter.format(transaction.completedAt)}</>
              )}
            </p>
          </div>
        </div>
      </div>

      <ResultRenderer
        status={transaction.resultStatus}
        result={result}
        shareLink={shareLink}
      />
    </div>
  )
}
