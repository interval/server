import { useState } from 'react'
import { usePopoverState } from 'reakit'
import { isValidDate } from '~/utils/date'
import {
  IVDateTimePickerProps,
  DateTimePickerState,
  getInitialState,
  stateToOnChangeValue,
  dateToInputString,
  isValidDateString,
  getDateObjectFromState,
  isEmptyValue,
} from './datePickerUtils'
import { TimePickerState } from './TimeInput'
import { preventDefaultInputEnterKey } from '~/utils/preventDefaultInputEnter'

export default function useDateTimePickerState(props: IVDateTimePickerProps) {
  const [state, setState] = useState<DateTimePickerState>(
    getInitialState(props.value)
  )

  const popover = usePopoverState({
    animated: 250,
    placement: 'bottom-end',
  })

  const onChange = (value: Partial<DateTimePickerState> | null) => {
    let newState: DateTimePickerState = state

    if (!value) {
      newState = getInitialState()
    } else {
      newState = {
        ...state,
        ...value,
      }
    }

    newState.jsDate = getDateObjectFromState(newState)
    // newState.dateInputValue = dateToInputString(newState.jsDate)

    setState(newState)

    props.onChange(stateToOnChangeValue(newState))
  }

  const onDateInputChange = (value: string) => {
    if (value === '') {
      return onChange(null)
    }

    const [month, day, year] = value.split('/').map(Number)

    onChange({
      dateInputValue: value,
      month,
      day,
      year,
    })
  }

  const onPickerChange = (date: Date) => {
    if (!isValidDate(date)) return

    onChange({
      dateInputValue: dateToInputString(date),
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    })
  }

  const onTimeChange = (value: Partial<TimePickerState>) => {
    onChange(value)
  }

  const onDateInputFocus = () => {
    // immediately showing the popover interferes with the click-outside behavior.
    // a slight delay seems to fix this.
    setTimeout(popover.show, 100)
  }

  const onDateInputBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    // don't fire an onchange event if no text is entered
    if (event.target.value === '') return

    if (!isValidDateString(event.target.value)) {
      onDateInputChange('')
      popover.hide() // prevents a sticky focus state
    }
  }

  const onDateInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    preventDefaultInputEnterKey(event)

    if (popover.visible && (event.key === 'Return' || event.key === 'Enter')) {
      popover.hide()
      event.preventDefault()

      if (
        state.month &&
        state.day &&
        !isEmptyValue(state.day) &&
        !isEmptyValue(state.month) &&
        String(state.year).length !== 4
      ) {
        const now = new Date()

        onChange({
          dateInputValue: dateToInputString(
            new Date(now.getFullYear(), state.month - 1, state.day)
          ),
          year: new Date().getFullYear(),
        })
      }
    } else {
      popover.show()
    }
  }

  const onClear = () => {
    onChange(null)
  }

  return {
    state,
    onChange,
    onClear,
    popover,
    onDateInputChange,
    onDateInputKeyDown,
    onPickerChange,
    onTimeChange,
    onDateInputFocus,
    onDateInputBlur,
  }
}
