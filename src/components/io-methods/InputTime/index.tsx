import { useState, useMemo, useCallback } from 'react'
import {
  compareTimeInputs,
  TimePickerValue,
} from '~/components/IVDateTimePicker/datePickerUtils'
import IVInputField from '~/components/IVInputField'
import IVTimePicker from '~/components/IVTimePicker'
import { timeFormatter } from '~/utils/formatters'
import { RCTResponderProps } from '~/components/RenderIOCall'
import { IOComponentError } from '~/components/RenderIOCall/ComponentError'
import useInput from '~/utils/useInput'

export default function InputTime(props: RCTResponderProps<'INPUT_TIME'>) {
  const [value, setValue] = useState<TimePickerValue | null>(
    (!(props.value instanceof IOComponentError) ? props.value : null) ?? null
  )

  const { errorMessage } = useInput(props)

  const { onUpdatePendingReturnValue, isOptional, min, max } = props

  const constraintDetails = useMemo(() => {
    if (min && max) {
      const minTime = new Date()
      minTime.setHours(min.hour, min.minute)
      const maxTime = new Date()
      maxTime.setHours(max.hour, max.minute)
      return `between ${timeFormatter.format(
        minTime
      )} and ${timeFormatter.format(maxTime)}`
    } else if (min) {
      const minTime = new Date()
      minTime.setHours(min.hour, min.minute)
      return `later than or equal to ${timeFormatter.format(minTime)}`
    } else if (max) {
      const maxTime = new Date()
      maxTime.setHours(max.hour, max.minute)
      return `earlier than or equal to ${timeFormatter.format(maxTime)}`
    }

    return undefined
  }, [min, max])

  const constraints = useMemo(
    () => (constraintDetails ? `Must be ${constraintDetails}.` : undefined),
    [constraintDetails]
  )

  const onChange = useCallback(
    (value: TimePickerValue | null) => {
      setValue(value)

      if (value) {
        if (
          (min && compareTimeInputs(value, min) < 0) ||
          (max && compareTimeInputs(value, max) > 0)
        ) {
          onUpdatePendingReturnValue(
            new IOComponentError(`Please enter a time ${constraintDetails}.`)
          )
        } else {
          onUpdatePendingReturnValue(value)
        }
      } else if (isOptional) {
        onUpdatePendingReturnValue(undefined)
      } else {
        onUpdatePendingReturnValue(
          new IOComponentError(`Please enter a valid time.`)
        )
      }
    },
    [onUpdatePendingReturnValue, isOptional, min, max, constraintDetails]
  )

  return (
    <IVInputField
      label={props.label}
      id={props.id}
      helpText={props.helpText}
      optional={props.isOptional}
      errorMessage={errorMessage}
      constraints={constraints}
    >
      <div className="max-w-[200px]">
        <IVTimePicker
          id={props.id}
          value={value}
          onChange={onChange}
          hasError={!!errorMessage}
          disabled={props.disabled || props.isSubmitting}
          showPlaceholder={props.isCurrentCall || props.context === 'docs'}
        />
      </div>
    </IVInputField>
  )
}
