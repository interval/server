import { CURRENCIES, CurrencyCode } from '@interval/sdk/dist/ioSchema'

export { CURRENCIES }
export type { CurrencyCode }

const CURRENCY_SYMBOLS: Record<Partial<CurrencyCode>, string> = {
  USD: '$',
  CAD: '$',
  AUD: '$',
  EUR: '€',
  GBP: '£',
  CNY: '¥',
  JPY: '¥',
}

export function getCurrencySymbol(code: CurrencyCode): string | undefined {
  return CURRENCY_SYMBOLS[code]
}
