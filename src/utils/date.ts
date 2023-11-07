import { IANAZone } from 'luxon'
import { dateTimeFormatter } from './formatters'

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export const DAYS_OF_MONTH = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
  23, 24, 25, 26, 27, 28, 29, 30, 31,
]

// https://gist.github.com/jlbruno/1535691
export function numberWithOrdinal(n: number) {
  if (n === 0) return String(n)

  switch (n % 10) {
    case 1:
      if (n === 11) return `${n}th`
      return `${n}st`
    case 2:
      if (n === 12) return `${n}th`
      return `${n}nd`
    case 3:
      if (n === 13) return `${n}th`
      return `${n}rd`
    default:
      return `${n}th`
  }
}

// with help from https://gist.github.com/stefanmaric/84ca8f69dc644ae3fd498d49f9036e01
export const RELATIVE_TIME_UNITS = [
  {
    multiplier: 1000,
    name: 'second',
    threshold: 45,
  },
  {
    multiplier: 60,
    name: 'minute',
    threshold: 45,
  },
  {
    multiplier: 60,
    name: 'hour',
    threshold: 22,
  },
  {
    multiplier: 24,
    name: 'day',
    threshold: 5,
  },
  {
    multiplier: 7,
    name: 'week',
    threshold: 4,
  },
  {
    multiplier: 30,
    name: 'month',
    threshold: 4,
  },
  {
    multiplier: 4,
    name: 'year',
    threshold: null,
  },
]

const selectRelativeTimeUnit = (
  from: Date,
  to = new Date(),
  fullDateThresholdInHours = 24 * 7
) => {
  const diff = to.getTime() - from.getTime()
  let value = diff
  let unit = 'milliseconds'
  let timestamp: Date | null = null

  for (const u of RELATIVE_TIME_UNITS) {
    const threshold = u.threshold

    value = value / u.multiplier
    unit = u.name

    if (unit === 'hour' && value > fullDateThresholdInHours) {
      timestamp = from
      break
    }

    if (typeof threshold !== 'number' || Math.abs(value) < threshold) {
      break
    }
  }

  if (Math.abs(value) < 1) {
    value = value > 0 ? 1 : -1
  } else {
    value = Math.round(value)
  }

  return {
    timestamp,
    unit,
    value,
  }
}

interface RelativeTimeOptions {
  to?: Date
  fullDateThresholdInHours?: number
  formatter?: Intl.DateTimeFormat
}

export default function relativeTime(
  from: Date,
  options: RelativeTimeOptions = {}
) {
  const { unit, value, timestamp } = selectRelativeTimeUnit(
    from,
    options.to || new Date(),
    options.fullDateThresholdInHours || 24 * 7
  )

  if (timestamp) {
    return (options.formatter || dateTimeFormatter).format(timestamp)
  }

  if (value === 0) {
    return 'now'
  }

  if (value === 1) {
    return `${value} ${unit} ago`
  }

  if (value === -1) {
    return `in ${value} ${unit}`
  }

  return `${value} ${unit}s ago`
}

export function isValidDate(date?: Date | null): boolean {
  return !!(date && !isNaN(date.valueOf()))
}

export function timeToDisplayString(
  hours: number,
  minutes = 0,
  zone?: string
): string {
  let amPm = 'AM'

  if (hours === 0) {
    hours = 12
  } else if (hours >= 12) {
    amPm = 'PM'

    if (hours > 12) {
      hours -= 12
    }
  }

  let str = `${hours}:${minutes.toString().padStart(2, '0')} ${amPm}`

  if (zone) {
    const z = new IANAZone(zone)
    if (z.isValid) {
      str += ' ' + z.offsetName(new Date().getTime(), { format: 'short' })
    }
  }

  return str
}

export function displayStringToTime(time: string): {
  hours: number
  minutes: number
} {
  const [times, amPm] = time.split(' ')
  let [hours, minutes] = times.split(':').map(s => Number(s))

  if (Number.isNaN(hours) || Number.isNaN(minutes))
    throw new Error(`Invalid time string: ${time}`)

  if (amPm.toLowerCase() === 'pm') {
    if (hours < 12) {
      hours += 12
    }
  } else if (hours === 12) {
    hours = 0
  }

  return { hours, minutes }
}
