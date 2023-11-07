export { isEmail } from './validate'

export function getDomain(email: string): string | undefined {
  const index = email.indexOf('@')
  if (index < 0) return undefined

  return email.substring(index + 1)
}
