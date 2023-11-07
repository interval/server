import { isSlugValid } from '../validate'

describe('isSlugValid', () => {
  const valid = [
    'CamelCase',
    'camelCase',
    'snake_case',
    'SCREAMING_SNAKE_CASE',
    'kebab-case',
    'Camel-Kebab-Case',
    '__dunder__separated__',
    'period.separated',
    'Period.Separated',
  ]

  const invalid = [
    'with spaces',
    'with+plus',
    'with:colon',
    'with_exclamation!',
  ]

  for (const slug of valid) {
    test(slug, () => {
      expect(isSlugValid(slug)).toBe(true)
    })
  }

  for (const slug of invalid) {
    test(slug, () => {
      expect(isSlugValid(slug)).toBe(false)
    })
  }
})
