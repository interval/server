import { BackwardCompatibleLoadingState } from '@interval/sdk/dist/internalRpcSchema'
import IVSpinner from '~/components/IVSpinner'

export default function DisplayProgressIndeterminate(
  props: BackwardCompatibleLoadingState
) {
  return (
    <div className="flex flex-col items-center py-24">
      <IVSpinner className="w-6 h-6 text-gray-300 mb-2" />
      {(props.label ?? props.title) && (
        <p className="text-base font-medium text-gray-700" data-pw-label>
          {props.label ?? props.title}
        </p>
      )}
      {props.description && (
        <p className="text-sm text-gray-500 mt-1" data-pw-description>
          {props.description}
        </p>
      )}
    </div>
  )
}
