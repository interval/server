import { BackwardCompatibleLoadingState } from '@interval/sdk/dist/internalRpcSchema'
import { getPercentComplete } from './Progress'
import { useRef } from 'react'
import useTransactionAutoScroll from '~/utils/useTransactionAutoScroll'
import DotsSpinner from '~/components/DotsSpinner'

export default function InlineLoading(props: BackwardCompatibleLoadingState) {
  const percentComplete = getPercentComplete(props)
  const ref = useRef<HTMLDivElement>(null)

  useTransactionAutoScroll({
    // always enabled; element is only shown for the current call in the append UI
    enabled: true,
    ref,
  })

  return (
    <div
      className="flex items-start justify-start w-full max-w-[500px] py-4"
      ref={ref}
    >
      <div className="w-3 h-5 text-gray-400 text-xl font-mono leading-[20px]">
        <DotsSpinner />
      </div>
      <div className="pl-3">
        {(props.label ?? props.title) && (
          <p className="text-sm font-medium text-gray-700" data-pw-label>
            {props.label ?? props.title}
          </p>
        )}
        {props.description && (
          <p className="text-sm text-gray-500 mt-1" data-pw-description>
            {props.description}
          </p>
        )}
        {percentComplete !== null && (
          <>
            <div className="w-[220px] bg-primary-100 rounded-full h-2.5 mt-4 mb-1.5 overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: percentComplete }}
              ></div>
            </div>
            <p className="text-xs text-gray-500">
              Completed {props.itemsCompleted} of {props.itemsInQueue}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
