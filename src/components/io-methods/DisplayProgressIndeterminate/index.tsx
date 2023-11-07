import IVSpinner from '~/components/IVSpinner'
import { RCTResponderProps } from '~/components/RenderIOCall'

export default function DisplayProgressIndeterminate(
  props: RCTResponderProps<'DISPLAY_PROGRESS_INDETERMINATE'>
) {
  return (
    <div className="space-y-2 flex flex-col items-center text-gray-400">
      <h2 className="text-lg">{props.label}</h2>
      <IVSpinner />
    </div>
  )
}
