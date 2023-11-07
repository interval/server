import { pluralize } from '~/utils/text'

export function isSlugValid(slug: string): boolean {
  if (slug === '') return false

  if (/[^-_.a-zA-Z\d]/.test(slug)) return false

  return true
}

export function isGroupSlugValid(prefix: string | undefined): boolean {
  if (prefix === undefined) return true

  if (prefix === '') return false

  // Disallow double slash //
  if (/\/\//.test(prefix)) return false

  if (/[^-_.a-zA-Z\d/]/.test(prefix)) return false

  return true
}

export function isURLSafe(slug: string): boolean {
  return slug === encodeURIComponent(slug)
}

export function isOrgSlugValid(slug: string): boolean {
  return (
    isSlugValid(slug) &&
    slug.toLowerCase() === slug &&
    isURLSafe(slug) &&
    !/\./.test(slug) &&
    slug.length >= 2
  )
}

export function isEmail(email: string): boolean {
  // Copied from zod
  // https://github.com/colinhacks/zod/blob/c63a5988613f0accb2099d88f05db4201618ad6e/src/types.ts#L425
  return /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i.test(
    email
  )
}

export function deserializeDate(s: string): Date | null {
  const d = new Date(s)
  if (d.toJSON() === s) return d

  return null
}

export interface ValidateNumberOptions {
  min?: number
  max?: number
  decimals?: number
}

export class InvalidNumberError extends Error {}

/**
 * Throws an InvalidNumberError if the number is not valid.
 */
export function validateNumber(
  value: string | number,
  props?: ValidateNumberOptions
): number {
  const valueAsNumber = Number(value)
  const valueAsString = value.toString()

  if (valueAsString.length === 0) {
    throw new InvalidNumberError('Please enter a valid number.')
  }

  if (isNaN(valueAsNumber)) {
    throw new InvalidNumberError('Please enter a valid number.')
  }

  let constraintDetails: string | undefined

  if (props?.min !== undefined && props?.max !== undefined) {
    constraintDetails = `between ${props.min} and ${props.max}`
  } else if (props?.min !== undefined) {
    constraintDetails = `greater than or equal to ${props.min}`
  } else if (props?.max !== undefined) {
    constraintDetails = `less than or equal to ${props.max}`
  }

  if (
    (props?.min !== undefined && valueAsNumber < props.min) ||
    (props?.max !== undefined && valueAsNumber > props.max)
  ) {
    throw new InvalidNumberError(`Please enter a number ${constraintDetails}.`)
  }

  const decimals = props?.decimals ?? 0
  const places = valueAsString.split('.')[1]
  if (places !== undefined && places.length > decimals) {
    throw new InvalidNumberError(
      decimals
        ? `Please enter a number with up to ${decimals} decimal ${pluralize(
            decimals,
            'place',
            'places'
          )}.`
        : 'Please enter a whole number.'
    )
  }

  if (valueAsString === 'Infinity') {
    throw new InvalidNumberError('Please enter a valid number.')
  }

  return valueAsNumber
}

export function isNumber(
  value: string | number,
  options?: ValidateNumberOptions
): boolean {
  try {
    validateNumber(value, options)
    return true
  } catch {
    return false
  }
}
