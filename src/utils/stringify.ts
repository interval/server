/**
 * Mostly a wrapper around JSON.stringify that excludes wrapping quotes from strings.
 */
export default function stringify(
  value:
    | string
    | number
    | boolean
    | null
    | undefined
    | Record<string, any>
    | bigint
    | Date
): string {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'bigint') {
    return `${value}n`
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  return JSON.stringify(value)
}
