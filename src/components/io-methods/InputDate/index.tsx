import { useState, useCallback, useMemo } from 'react'
import IVDatePicker from '~/components/IVDatePicker'
import {
  compareDateObjects,
  objectToDate,
  DatePickerValue,
} from '~/components/IVDateTimePicker/datePickerUtils'
import IVInputField from '~/components/IVInputField'
import { dateFormatter } from '~/utils/formatters'
import { RCTResponderProps } from '~/components/RenderIOCall'
import { IOComponentError } from '~/components/RenderIOCall/ComponentError'
import useInput from '~/utils/useInput'

export default function InputDate(props: RCTResponderProps<'INPUT_DATE'>) {
  const [value, setValue] = useState<Date | null>(
    !(props.value instanceof IOComponentError)
      ? getInitialState(props.value)
      : null
  )

  const { errorMessage } = useInput(props)

  const { onUpdatePendingReturnValue, isOptional, min, max } = props

  const constraintDetails = useMemo(() => {
    if (min && max) {
      return `between ${dateFormatter.format(
        objectToDate(min)
      )} and ${dateFormatter.format(objectToDate(max))}`
    } else if (min) {
      return `later than or equal to ${dateFormatter.format(objectToDate(min))}`
    } else if (max) {
      return `earlier than or equal to ${dateFormatter.format(
        objectToDate(max)
      )}`
    }

    return undefined
  }, [min, max])

  const constraints = useMemo(
    () => (constraintDetails ? `Must be ${constraintDetails}.` : undefined),
    [constraintDetails]
  )

  const onChange = useCallback(
    (value: DatePickerValue | null) => {
      setValue(value?.jsDate ?? null)

      if (value) {
        if (
          (min && compareDateObjects(value, min) < 0) ||
          (max && compareDateObjects(value, max) > 0)
        ) {
          onUpdatePendingReturnValue(
            new IOComponentError(`Please enter a date ${constraintDetails}.`)
          )
        } else {
          onUpdatePendingReturnValue(value)
        }
      } else if (isOptional) {
        onUpdatePendingReturnValue(undefined)
      } else {
        onUpdatePendingReturnValue(
          new IOComponentError(`Please enter a valid date.`)
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
      <div className="max-w-[270px]">
        <IVDatePicker
          id={props.id}
          value={value}
          onChange={onChange}
          hasError={!!errorMessage}
          minDate={props.min ? objectToDate(props.min) : undefined}
          maxDate={props.max ? objectToDate(props.max) : undefined}
          disabled={props.disabled || props.isSubmitting}
          showPlaceholder={props.isCurrentCall || props.context === 'docs'}
        />
      </div>
    </IVInputField>
  )
}

function getInitialState(
  defaultValue: RCTResponderProps<'INPUT_DATE'>['defaultValue']
) {
  if (!defaultValue) {
    return null
  }

  if (defaultValue instanceof Date) {
    return defaultValue
  }

  return objectToDate(defaultValue)
}
