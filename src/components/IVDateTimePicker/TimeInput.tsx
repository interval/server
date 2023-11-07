import classNames from 'classnames'
import { DateTimePickerState, isEmptyValue } from './datePickerUtils'

export type TimePickerState = Pick<
  DateTimePickerState,
  'hour' | 'minute' | 'meridian'
>

interface TimePickerInputsProps {
  id?: string
  disabled?: boolean
  value: TimePickerState | null
  onChange: (state: Partial<TimePickerState>) => void
  showPlaceholder?: boolean
}

export default function TimeInput(props: TimePickerInputsProps) {
  const onChange = (field: keyof TimePickerState, value: string) => {
    if (!value) {
      props.onChange({
        [field]: null,
      })
      return
    }

    props.onChange({
      [field]: field === 'meridian' ? value : Number(value),
    })
  }

  const hasValue =
    !isEmptyValue(props.value?.hour) || !isEmptyValue(props.value?.minute)

  const showPlaceholder = props.showPlaceholder ?? true

  return (
    <div className="flex items-center justify-start text-gray-400">
      <NumberSelect
        onChange={v => onChange('hour', v)}
        value={props.value?.hour}
        disabled={props.disabled}
        id={props.id}
      >
        <>
          {isEmptyValue(props.value?.hour) && (
            <option value="">{showPlaceholder ? 'HH' : ''}</option>
          )}
          {hours.map(i => (
            <Option key={i} value={i} />
          ))}
        </>
      </NumberSelect>

      {(!isEmptyValue(props.value?.hour) || showPlaceholder) && (
        <span className="text-center inline-block px-px">:</span>
      )}

      <NumberSelect
        onChange={v => onChange('minute', v)}
        value={props.value?.minute}
        disabled={props.disabled}
      >
        <>
          {isEmptyValue(props.value?.minute) && (
            <option value="">{showPlaceholder ? 'MM' : ''}</option>
          )}
          {minutes.map(i => (
            <option key={i} value={i}>
              {String(i).padStart(2, '0')}
            </option>
          ))}
        </>
      </NumberSelect>

      <select
        onChange={e => onChange('meridian', e.target.value)}
        className={classNames(
          'focus:outline-none focus:bg-blue-100 p-0 h-[20px] appearance-none ml-1 bg-transparent cursor-pointer disabled:cursor-default leading-5',
          {
            'text-gray-400': !hasValue,
            'text-gray-600': hasValue,
          }
        )}
        value={props.value?.meridian ?? ''}
        disabled={props.disabled}
      >
        {((!isEmptyValue(props.value?.hour) &&
          !isEmptyValue(props.value?.meridian)) ||
          showPlaceholder) && (
          <>
            <option value="am">AM</option>
            <option value="pm">PM</option>
          </>
        )}
      </select>
    </div>
  )
}

function NumberSelect({
  onChange,
  value,
  disabled,
  children,
  id,
}: {
  onChange: (value: string) => void
  value?: number | null
  disabled?: boolean
  children?: React.ReactChild
  id?: string
}) {
  const onKeyDown = (event: React.KeyboardEvent<HTMLSelectElement>) => {
    if (event.key === 'Backspace') {
      onChange('')
    }
  }

  return (
    <select
      onChange={e => onChange(e.currentTarget.value)}
      onKeyDown={onKeyDown}
      className={classNames(
        'focus:outline-none focus:bg-blue-100 p-0 h-[20px] px-0.5 appearance-none bg-transparent first:text-right cursor-pointer disabled:cursor-default leading-5',
        {
          'text-gray-400 focus:text-gray-600': isEmptyValue(value),
          'text-gray-600': !isEmptyValue(value),
        }
      )}
      value={value ?? ''}
      disabled={disabled}
      id={id}
    >
      {children}
    </select>
  )
}

const hours = Array.from(new Array(12), (_, i) => i + 1)
const minutes = Array.from(new Array(60), (_, i) => i)

function Option({ value }: { value: number }) {
  // safari doesn't support text alignment in `<select>`; this pushes numbers to the right
  if (value < 10) {
    return <option value={value}>&nbsp;{value}</option>
  }
  return <option value={value}>{value}</option>
}
