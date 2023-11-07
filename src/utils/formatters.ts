import { DateTime, IANAZone } from 'luxon'

export const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
})

export const dateTimeFormatterWithTimeZone = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  timeZoneName: 'short',
})

export const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

export const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

export const numericDateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
})

export const yearlessDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
})

export const timeZoneFormatter = new Intl.DateTimeFormat('en-US', {
  timeZoneName: 'short',
})

export const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: 'numeric',
})

export const percentageFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
})

export function formatDateTime(
  date: Date,
  timeZoneName: string | null
): string {
  let dt = DateTime.fromJSDate(date)

  if (timeZoneName) {
    const z = new IANAZone(timeZoneName)

    if (z.isValid) {
      dt = dt.setZone(timeZoneName)
    }
  }

  return dt.toLocaleString({
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZoneName: 'short',
  })
}

export function formatDate(date: Date, timeZoneName: string | null): string {
  let dt = DateTime.fromJSDate(date)

  if (timeZoneName) {
    const z = new IANAZone(timeZoneName)

    if (z.isValid) {
      dt = dt.setZone(timeZoneName)
    }
  }

  return dt.toLocaleString({
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
