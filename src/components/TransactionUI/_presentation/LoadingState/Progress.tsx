import { BackwardCompatibleLoadingState } from '@interval/sdk/dist/internalRpcSchema'

export function getPercentComplete({
  itemsCompleted,
  itemsInQueue,
}: BackwardCompatibleLoadingState) {
  if (itemsCompleted === undefined || itemsInQueue === undefined) return null
  return `${((itemsCompleted / itemsInQueue) * 100).toFixed(2)}%`
}

export default function DisplayProgress(props: BackwardCompatibleLoadingState) {
  const percentComplete = getPercentComplete(props)

  return (
    <div className="text-center py-24">
      {(props.label ?? props.title) && (
        <p className="text-base font-medium text-gray-700" data-pw-label>
          {props.label ?? props.title}
        </p>
      )}
      {props.description && (
        <p className="text-gray-500 mt-1 text-sm" data-pw-description>
          {props.description}
        </p>
      )}
      {percentComplete !== null && (
        <>
          <div className="w-full bg-primary-100 rounded-full h-2.5 my-6 max-w-sm mx-auto overflow-hidden">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: percentComplete }}
            ></div>
          </div>
          <p className="text-sm font-medium font-mono text-gray-500">
            Completed {props.itemsCompleted} of {props.itemsInQueue}
          </p>
        </>
      )}
    </div>
  )
}
