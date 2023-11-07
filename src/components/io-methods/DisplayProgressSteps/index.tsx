import { RCTResponderProps } from '~/components/RenderIOCall'

export default function DisplayProgress(
  props: RCTResponderProps<'DISPLAY_PROGRESS_STEPS'>
) {
  const percentComplete = `${(
    (props.steps.completed / props.steps.total) *
    100
  ).toFixed(2)}%`

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">{props.label}</h2>
      {props.subTitle && <div>{props.subTitle}</div>}
      <div className="flex justify-between mb-1">
        <span className="text-base font-medium text-blue-700 dark:text-white">
          {props.currentStep}
        </span>
        <span className="text-sm font-medium text-blue-700 dark:text-white">
          {props.steps.completed}/{props.steps.total}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div
          className="bg-blue-600 h-2.5 rounded-full"
          style={{ width: percentComplete }}
        ></div>
      </div>
    </div>
  )
}
