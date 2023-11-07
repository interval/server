import { lazy, Suspense, useRef } from 'react'
import { PopoverDisclosure } from 'reakit'
import useDateTimePickerState from './useDateTimePickerState'
import { isEmptyValue, IVDateTimePickerProps } from './datePickerUtils'
import { DateInput } from './DateInput'
import TimeInput from './TimeInput'
import classNames from 'classnames'
import CloseIcon from '~/icons/compiled/Close'
import CalendarIcon from '~/icons/compiled/Calendar'

const CalendarPopover = lazy(() => import('./CalendarPopover'))

/*
 * Note, this will not work as the `as` prop of a Formik <Field />,
 * because its `onChange` handler expects an HTML event as its argument.
 */
export default function IVDateTimePicker(props: IVDateTimePickerProps) {
  const { isClearable = true, mode = 'datetime' } = props
  const dateInputRef = useRef<HTMLInputElement>(null)

  const {
    state,
    onClear,
    popover,
    onDateInputChange,
    onDateInputKeyDown,
    onPickerChange,
    onTimeChange,
    onDateInputFocus,
    onDateInputBlur,
  } = useDateTimePickerState(props)

  const hasValue =
    Object.entries(state).filter(([key, value]) => {
      if (!['hour', 'minute', 'dateInputValue'].includes(key)) return false
      return !isEmptyValue(value)
    }).length > 0

  return (
    <div
      className={classNames(
        'iv-timepicker relative border rounded-md text-base sm:text-sm flex',
        {
          'bg-white': !props.disabled,
          'bg-gray-50': props.disabled,
          'border-amber-500 bg-amber-50 focus-within:iv-field-focus--error':
            props.hasError,
          'border-gray-300 focus-within:iv-field-focus': !props.hasError,
        }
      )}
    >
      <div
        className={classNames(
          'flex-1 flex items-center justify-start iv-datepicker space-x-2 pl-3 py-2',
          {
            'pr-3': mode !== 'date',
          }
        )}
      >
        {mode !== 'time' && (
          <DateInput
            id={props.id}
            ref={dateInputRef}
            disabled={props.disabled}
            value={state?.dateInputValue}
            onChange={onDateInputChange}
            onBlur={e => {
              if (props.onBlur) props.onBlur()
              onDateInputBlur(e)
            }}
            onFocus={onDateInputFocus}
            onKeyDown={onDateInputKeyDown}
            showPlaceholder={props.showPlaceholder}
          />
        )}
        {mode !== 'date' && (
          <TimeInput
            onChange={onTimeChange}
            value={state}
            disabled={props.disabled}
            id={mode === 'time' ? props.id : undefined}
            showPlaceholder={props.showPlaceholder}
          />
        )}
      </div>

      <div className="flex-none flex items-stretch">
        {isClearable && !props.disabled && (
          <button
            className={classNames(
              'flex justify-center items-center text-gray-400 w-6 hover:opacity-60 disabled:cursor-auto disabled:opacity-100 m-1',
              {
                invisible: !hasValue && props.mode !== 'date',
                hidden: !hasValue && props.mode === 'date',
              }
            )}
            onClick={onClear}
            type="button"
            disabled={props.disabled}
          >
            <CloseIcon className="w-3 h-3" />
          </button>
        )}

        {mode !== 'time' && !props.disabled && (
          <>
            <Suspense fallback={<></>}>
              <PopoverDisclosure
                {...popover}
                type="button"
                className="iv-datepicker__button"
                disabled={props.disabled}
              >
                <CalendarIcon className="w-5 h-5" />
              </PopoverDisclosure>
              <CalendarPopover
                popover={popover}
                onChange={onPickerChange}
                state={state}
                minDate={props.minDate}
                maxDate={props.maxDate}
              />
            </Suspense>
          </>
        )}
      </div>
    </div>
  )
}
