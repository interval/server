import { useState, useMemo, useCallback } from 'react'
import { ioSchema } from '@interval/sdk/dist/ioSchema'
import { z } from 'zod'
import IVDateTimePicker from '~/components/IVDateTimePicker'
import { dateTimeFormatter } from '~/utils/formatters'
import {
  compareDateObjects,
  IVDateTimeChangeValue,
  IVDateTimePickerProps,
  objectToDate,
} from '~/components/IVDateTimePicker/datePickerUtils'
import { RCTResponderProps } from '~/components/RenderIOCall'
import { IOComponentError } from '~/components/RenderIOCall/ComponentError'
import IVInputField from '~/components/IVInputField'
import useInput from '~/utils/useInput'

export default function InputDateTime(
  props: RCTResponderProps<'INPUT_DATETIME'>
) {
  const [value, setValue] = useState<IVDateTimePickerProps['value'] | null>(
    !(props.value instanceof IOComponentError)
      ? getInitialState(props.value)
      : null
  )
  const { errorMessage } = useInput(props)

  const { onUpdatePendingReturnValue, isOptional, min, max } = props

  const constraintDetails = useMemo(() => {
    if (min && max) {
      return `between ${dateTimeFormatter.format(
        objectToDate(min)
      )} and ${dateTimeFormatter.format(objectToDate(max))}`
    } else if (min) {
      return `later than or equal to ${dateTimeFormatter.format(
        objectToDate(min)
      )}`
    } else if (max) {
      return `earlier than or equal to ${dateTimeFormatter.format(
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
    (value: IVDateTimeChangeValue | null) => {
      setValue(value?.jsDate ?? null)

      if (value) {
        const returnValue = getReturnValue(value)

        if (!returnValue) {
          onUpdatePendingReturnValue(
            isOptional ? undefined : new IOComponentError()
          )
        } else if (
          (min && compareDateObjects(returnValue, min) < 0) ||
          (max && compareDateObjects(returnValue, max) > 0)
        ) {
          onUpdatePendingReturnValue(
            new IOComponentError(`Please enter a date ${constraintDetails}.`)
          )
        } else {
          onUpdatePendingReturnValue(returnValue)
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
      <div className="max-w-[330px]">
        <IVDateTimePicker
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
  defaultValue: RCTResponderProps<'INPUT_DATETIME'>['defaultValue'] | null
): IVDateTimePickerProps['value'] | null {
  if (!defaultValue) {
    return null
  }

  if (defaultValue instanceof Date) {
    return defaultValue
  }

  return objectToDate(defaultValue)
}

function getReturnValue(
  value: IVDateTimeChangeValue | null
): z.infer<typeof ioSchema['INPUT_DATETIME']['returns']> | null {
  if (!value) return null

  const { year, month, day, hour, minute, jsDate } = value

  // do not return an object unless all values are present
  if (
    year === null ||
    month === null ||
    day === null ||
    hour === null ||
    minute === null ||
    jsDate === null
  ) {
    return null
  }

  return { year, month, day, hour, minute }
}
