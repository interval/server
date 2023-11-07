import {
  DateObject,
  TimeObject,
  DateTimeObject,
} from '@interval/sdk/dist/ioSchema'
import { isValidDate } from '~/utils/date'

export type IVDateTimeChangeValue = {
  year: number | null
  month: number | null
  day: number | null
  hour: number | null
  minute: number | null
  jsDate: Date | null
}

export interface IVDateTimePickerProps {
  id?: string
  value: Date | null
  onChange: (value: IVDateTimeChangeValue | null) => void
  onBlur?: () => void
  isClearable?: boolean
  showPlaceholder?: boolean
  disabled?: boolean
  mode?: 'date' | 'time' | 'datetime'
  minDate?: Date | null
  maxDate?: Date | null
  hasError?: boolean
}

export function objectToDate(o: DateObject | DateTimeObject): Date {
  return new Date(
    o.year,
    o.month - 1,
    o.day,
    'hour' in o ? o.hour : 0,
    'minute' in o ? o.minute : 0,
    0
  )
}

export function compareDateObjects<D extends DateObject | DateTimeObject>(
  a: D,
  b: D
): number {
  if (a.year < b.year) return -1
  if (a.year > b.year) return 1
  if (a.month < b.month) return -1
  if (a.month > b.month) return 1
  if (a.day < b.day) return -1
  if (a.day > b.day) return 1

  if ('hour' in a && 'hour' in b) {
    if (a.hour < b.hour) return -1
    if (a.hour > b.hour) return 1
  }

  if ('minute' in a && 'minute' in b) {
    if (a.minute < b.minute) return -1
    if (a.minute > b.minute) return 1
  }

  return 0
}

export function compareTimeInputs(a: TimeObject, b: TimeObject): number {
  return a.hour - b.hour || a.minute - b.minute
}

export type TimePickerValue = {
  hour: number
  minute: number
}

export type IVTimePickerProps = Omit<
  IVDateTimePickerProps,
  'mode' | 'onChange' | 'value' | 'onBlur' | 'minDate' | 'maxDate'
> & {
  value: TimePickerValue | null
  onChange: (value: TimePickerValue | null) => void
}

export type DatePickerValue = {
  year: number
  month: number
  day: number
  jsDate: Date
}

export type IVDatePickerProps = Omit<
  IVDateTimePickerProps,
  'mode' | 'onChange' | 'value'
> & {
  value: Date | null
  onChange: (value: DatePickerValue | null) => void
}

export interface DateTimePickerState {
  year: number | null
  month: number | null
  day: number | null
  hour: number | null
  minute: number | null
  meridian: 'am' | 'pm'

  dateInputValue: string
  jsDate: Date | null
}

export function getInitialState(
  value?: IVDateTimePickerProps['value']
): DateTimePickerState {
  if (!value) {
    return {
      dateInputValue: '',
      jsDate: null,
      year: null,
      month: null,
      day: null,
      hour: null,
      minute: null,
      meridian: 'am',
    }
  }

  const { hour, meridian } = to12Hour(value.getHours())

  return {
    dateInputValue: dateToInputString(value),
    jsDate: value,
    year: value.getFullYear(),
    month: value.getMonth() + 1,
    day: value.getDate(),
    hour,
    minute: value.getMinutes(),
    meridian,
  }
}

export function stateToOnChangeValue(
  state: DateTimePickerState | null
): IVDateTimeChangeValue | null {
  if (!state) return null

  const { year, day, minute, jsDate } = state

  const month = state.month === null ? null : state.month
  const hour = to24Hour(state.hour, state.meridian)

  return { year, month, day, hour, minute, jsDate }
}

export function dateToInputString(date?: Date | null): string {
  if (!date || !isValidDate(date)) return ''
  return (
    (date.getMonth() + 1).toString().padStart(2, '0') +
    '/' +
    date.getDate().toString().padStart(2, '0') +
    '/' +
    date.getFullYear()
  )
}

export function toTwelveHour(hour: number): number {
  return hour > 12 ? hour - 12 : hour
}

function to24Hour(
  hour: number | null | undefined,
  meridian: 'am' | 'pm' | undefined
): number | null {
  if (hour === null || hour === undefined) return null
  if (meridian === 'am' && hour === 12) return 0
  if (meridian === 'pm' && hour < 12) return hour + 12
  return hour
}

function to12Hour(hour: number): { hour: number; meridian: 'am' | 'pm' } {
  if (hour > 12) {
    return {
      hour: hour - 12,
      meridian: 'pm',
    }
  }

  return {
    hour: hour === 0 ? 12 : hour,
    meridian: 'am',
  }
}

export function isValidDateString(text: string): boolean {
  const date = new Date(text)

  if (text.split('/').length !== 3) {
    return false
  }

  // consider year invalid if not 4 digits
  if (text.split('/')[2].length !== 4) {
    return false
  }

  return date.toString() !== 'Invalid Date'
}

export function getDateObjectFromState(
  state: DateTimePickerState
): Date | null {
  let date = state.jsDate

  if (state.year === null || state.month === null || state.day === null) {
    return null
  }

  if (String(state.year).length < 4) {
    return null
  }

  if (!date) {
    date = new Date()
  }

  date.setFullYear(state.year, state.month - 1, state.day)

  const hour = to24Hour(state.hour, state.meridian)

  if (hour !== null && state.minute !== null) {
    date.setHours(hour, state.minute)
  } else {
    date.setHours(0, 0, 0, 0)
  }

  if (!isValidDate(date)) return null

  return date
}

export function isEmptyValue(value: number | null | undefined | string) {
  return value === null || value === undefined || value === ''
}
