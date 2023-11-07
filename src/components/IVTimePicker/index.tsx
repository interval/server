import { useCallback } from 'react'
import IVDateTimePicker from '~/components/IVDateTimePicker'
import {
  IVTimePickerProps,
  IVDateTimeChangeValue,
} from '~/components/IVDateTimePicker/datePickerUtils'

/*
 * Note, this will not work as the `as` prop of a Formik <Field />,
 * because its `onChange` handler expects an HTML event as its argument.
 */
export default function IVTimePicker(props: IVTimePickerProps) {
  const { onChange: props_onChange } = props

  const onChange = useCallback(
    (value: IVDateTimeChangeValue | null) => {
      if (!value || value.hour === null || value.minute === null) {
        props_onChange(null)
        return
      }

      props_onChange({
        hour: value.hour,
        minute: value.minute,
      })
    },
    [props_onChange]
  )

  return (
    <IVDateTimePicker
      {...props}
      id={props.id}
      value={valueToDateObj(props.value)}
      mode="time"
      onChange={onChange}
    />
  )
}

function valueToDateObj(value?: IVTimePickerProps['value']) {
  if (!value) return null

  const date = new Date()
  date.setHours(value.hour ?? 0)
  date.setMinutes(value.minute ?? 0)

  return date
}
