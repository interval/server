import { useRef, useState, useEffect } from 'react'
import { usePopoverState, Popover } from 'reakit'
import { MONTH_NAMES } from '~/utils/date'
import Flatpickr from 'react-flatpickr'
import { DateTimePickerState, isEmptyValue } from './datePickerUtils'

export default function CalendarPopover({
  popover,
  onChange,
  state,
  minDate,
  maxDate,
}: {
  popover: ReturnType<typeof usePopoverState>
  onChange: (date: Date) => void
  state: DateTimePickerState | null
  minDate?: Date | null
  maxDate?: Date | null
}) {
  const fp = useRef<Flatpickr>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const value = state?.jsDate

  // nav state must be tracked independently because programmatic Flatpickr changes don't trigger re-renders.
  // this state helps sync the custom nav with the picker.
  const [navState, setNavState] = useState<{ month: number; year: number }>({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  })

  // sync navigation as the outer state changes
  useEffect(() => {
    if (!state) return

    let month = new Date().getMonth()
    let year = new Date().getFullYear()

    if (state.jsDate) {
      year = state.jsDate.getFullYear()
      month = state.jsDate.getMonth()

      fp.current?.flatpickr.setDate(state.jsDate)
    } else if (
      isEmptyValue(state.year) &&
      isEmptyValue(state.month) &&
      isEmptyValue(state.day)
    ) {
      fp.current?.flatpickr.clear()
    } else {
      if (
        state.year !== null &&
        !isEmptyValue(state.year) &&
        String(state.year).length === 4
      ) {
        year = state.year
      }
      if (
        state.month !== null &&
        !isEmptyValue(state.month) &&
        state.month <= 12
      ) {
        // `month` from state is 1-based; convert to 0-based
        month = state.month - 1
      }
    }

    setNavState({ month, year })
  }, [state])

  // sync flatpickr as the inner nav state changes
  useEffect(() => {
    fp.current?.flatpickr.changeMonth(navState.month, false)
    fp.current?.flatpickr.changeYear(navState.year)
  }, [navState])

  const onMonthNav = (state: CalendarNavState) => {
    setNavState({ month: state.month, year: state.year })
  }

  const onPickerChange = (dates: Date[]) => {
    const date = dates[0]
    if (!date) return
    onChange(date)
  }

  return (
    <Popover
      {...popover}
      aria-label="Select a date"
      style={{ zIndex: 10 }}
      className="focus:outline-none"
      unstable_initialFocusRef={containerRef}
      // prevent reakit from focusing other elements when the popover opens & closes.
      // this interferes with showing the popover when focusing the date input.
      unstable_autoFocusOnHide={false}
      unstable_autoFocusOnShow={false}
    >
      <div className="iv-datepicker__picker" ref={containerRef}>
        {fp.current && (
          <CalendarHeader
            fp={fp.current}
            state={navState}
            onChange={onMonthNav}
          />
        )}
        <Flatpickr
          ref={fp}
          options={{
            defaultDate: value ?? undefined,
            minDate: minDate ?? undefined,
            maxDate: maxDate ?? undefined,
            inline: true,
            onChange: onPickerChange,
            onClose: popover.hide,
            onDayCreate: function (dObj, dStr, fp, dayElem) {
              if (
                dayElem.dateObj.getDate() === state?.day &&
                dayElem.dateObj.getMonth() + 1 === state?.month
              ) {
                dayElem.classList.add('focused')
              }
            },
          }}
          render={(fpProps, fpRef) => {
            return (
              // flatpickr requires an input but we're managing our own text input
              <input type="hidden" ref={fpRef} className="sr-only" />
            )
          }}
        />
      </div>
    </Popover>
  )
}

interface CalendarNavState {
  year: number
  month: number
}

function CalendarHeader({
  fp,
  state,
  onChange,
}: {
  fp: Flatpickr
  state: { month?: number; year?: number }
  onChange: (state: CalendarNavState) => void
}) {
  const onNavClick = (type: 'month' | 'year', direction: 'prev' | 'next') => {
    let m = fp.flatpickr.currentMonth
    let y = fp.flatpickr.currentYear

    const change = direction === 'prev' ? -1 : 1

    if (type === 'month') {
      if (m === 0 && direction === 'prev') {
        m = 11
        y = y - 1
      } else if (m === 11 && direction === 'next') {
        m = 0
        y = y + 1
      } else {
        m = m + change
      }
    } else if (type === 'year') {
      y = y + change
    }

    const { minDate, maxDate } = fp.flatpickr.config
    if (minDate || maxDate) {
      const newDateStart = new Date(y, m, 1)
      const newDateEnd = new Date(y, m + 1, -1)
      console.log(newDateEnd)
      if (minDate && newDateEnd.valueOf() < minDate.valueOf()) {
        y = minDate.getFullYear()
        m = minDate.getMonth()
      } else if (maxDate && newDateStart.valueOf() > maxDate.valueOf()) {
        y = maxDate.getFullYear()
        m = maxDate.getMonth()
      }
    }

    fp.flatpickr.changeYear(y)
    fp.flatpickr.changeMonth(m, false)

    onChange({ year: y, month: m })
  }

  const onReset = () => {
    const year = new Date().getFullYear()
    const month = new Date().getMonth()

    fp.flatpickr.changeYear(year)
    fp.flatpickr.changeMonth(month, false)

    onChange({ year, month })
  }

  const now = new Date()

  return (
    <div className="flex items-center p-2 space-x-1">
      <CalendarNavButton
        type="year"
        direction="prev"
        onClick={onNavClick}
        children={
          <svg
            viewBox="0 0 30 30"
            fill="currentColor"
            className="w-4 h-4 inline-block"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M22.9135 8.44509C22.3901 7.88139 21.5088 7.84875 20.9451 8.37219L15.4451 14.4079C15.1613 14.6714 15 15.0413 15 15.4286C15 15.8159 15.1613 16.1857 15.4451 16.4493L20.9451 22.485C21.5088 23.0084 22.3901 22.9758 22.9135 22.4121C23.437 21.8484 23.4043 20.9671 22.8406 20.4436L18.4398 15.4286L22.8406 10.4135C23.4043 9.8901 23.437 9.0088 22.9135 8.44509Z" />
            <path d="M14.9135 8.44509C14.3901 7.88139 13.5088 7.84875 12.9451 8.37219L7.44509 14.4079C7.16127 14.6714 7 15.0413 7 15.4286C7 15.8159 7.16127 16.1857 7.44509 16.4493L12.9451 22.485C13.5088 23.0084 14.3901 22.9758 14.9135 22.4121C15.437 21.8484 15.4043 20.9671 14.8406 20.4436L10.4398 15.4286L14.8406 10.4135C15.4043 9.8901 15.437 9.0088 14.9135 8.44509Z" />
          </svg>
        }
      />
      <CalendarNavButton
        type="month"
        direction="prev"
        onClick={onNavClick}
        children={
          <svg
            viewBox="0 0 30 30"
            fill="currentColor"
            className="w-4 h-4 inline-block"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M18.9135 8.44509C18.3901 7.88139 17.5088 7.84875 16.9451 8.37219L11.4451 14.4079C11.1613 14.6714 11 15.0413 11 15.4286C11 15.8159 11.1613 16.1857 11.4451 16.4493L16.9451 22.485C17.5088 23.0084 18.3901 22.9758 18.9135 22.4121C19.437 21.8484 19.4043 20.9671 18.8406 20.4436L14.4398 15.4286L18.8406 10.4135C19.4043 9.8901 19.437 9.0088 18.9135 8.44509Z" />
          </svg>
        }
      />

      <button
        className="flex-1 text-sm font-medium w-[130px] border border-transparent rounded-md focus:outline-none focus:border-primary-500"
        title="Go to today"
        type="button"
        onClick={onReset}
      >
        {MONTH_NAMES[state.month ?? now.getMonth() + 1]} {state.year}
      </button>

      <CalendarNavButton
        type="month"
        direction="next"
        onClick={onNavClick}
        children={
          <svg
            viewBox="0 0 30 30"
            fill="currentColor"
            className="w-4 h-4 transform rotate-180 inline-block"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M18.9135 8.44509C18.3901 7.88139 17.5088 7.84875 16.9451 8.37219L11.4451 14.4079C11.1613 14.6714 11 15.0413 11 15.4286C11 15.8159 11.1613 16.1857 11.4451 16.4493L16.9451 22.485C17.5088 23.0084 18.3901 22.9758 18.9135 22.4121C19.437 21.8484 19.4043 20.9671 18.8406 20.4436L14.4398 15.4286L18.8406 10.4135C19.4043 9.8901 19.437 9.0088 18.9135 8.44509Z" />
          </svg>
        }
      />
      <CalendarNavButton
        type="year"
        direction="next"
        onClick={onNavClick}
        children={
          <svg
            viewBox="0 0 30 30"
            fill="currentColor"
            className="w-4 h-4 transform rotate-180 inline-block"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M22.9135 8.44509C22.3901 7.88139 21.5088 7.84875 20.9451 8.37219L15.4451 14.4079C15.1613 14.6714 15 15.0413 15 15.4286C15 15.8159 15.1613 16.1857 15.4451 16.4493L20.9451 22.485C21.5088 23.0084 22.3901 22.9758 22.9135 22.4121C23.437 21.8484 23.4043 20.9671 22.8406 20.4436L18.4398 15.4286L22.8406 10.4135C23.4043 9.8901 23.437 9.0088 22.9135 8.44509Z" />
            <path d="M14.9135 8.44509C14.3901 7.88139 13.5088 7.84875 12.9451 8.37219L7.44509 14.4079C7.16127 14.6714 7 15.0413 7 15.4286C7 15.8159 7.16127 16.1857 7.44509 16.4493L12.9451 22.485C13.5088 23.0084 14.3901 22.9758 14.9135 22.4121C15.437 21.8484 15.4043 20.9671 14.8406 20.4436L10.4398 15.4286L14.8406 10.4135C15.4043 9.8901 15.437 9.0088 14.9135 8.44509Z" />
          </svg>
        }
      />
    </div>
  )
}

function CalendarNavButton(props: any) {
  const onClick = () => {
    props.onClick(props.type, props.direction)
  }

  return (
    <button
      type="button"
      className="w-6 h-6 font-medium border border-gray-200 rounded leading-[22px] focus:outline-none focus:border-primary-500 hover:bg-gray-50 text-gray-700 flex items-center justify-center"
      children={props.children}
      onClick={onClick}
    />
  )
}
