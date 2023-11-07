import React, { useCallback } from 'react'
import IVDateTimePicker from '~/components/IVDateTimePicker'
import {
  IVDatePickerProps,
  IVDateTimeChangeValue,
} from '~/components/IVDateTimePicker/datePickerUtils'

/*
 * Note, this will not work as the `as` prop of a Formik <Field />,
 * because its `onChange` handler expects an HTML event as its argument.
 */
export default function IVDatePicker(props: IVDatePickerProps) {
  const { onChange: props_onChange } = props

  const onChange = useCallback(
    (value: IVDateTimeChangeValue | null) => {
      if (
        !value ||
        value.day === null ||
        value.month === null ||
        value.year === null ||
        value.jsDate === null
      ) {
        props_onChange(null)
        return
      }

      const { day, month, year, jsDate } = value

      props_onChange({
        day,
        month,
        year,
        jsDate,
      })
    },
    [props_onChange]
  )

  return (
    <IVDateTimePicker
      {...props}
      mode="date"
      onChange={onChange}
      onBlur={props.onBlur}
    />
  )
}
