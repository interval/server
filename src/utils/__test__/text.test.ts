import { commaSeparatedList, slugToName } from '../text'

describe('slugToName', () => {
  const cases = {
    CamelCase: 'Camel case',
    camelCase: 'Camel case',
    snake_case: 'Snake case',
    SCREAMING_SNAKE_CASE: 'Screaming snake case',
    'kebab-case': 'Kebab case',
    'Camel-Kebab-Case': 'Camel kebab case',
    __dunder__separated__: 'Dunder separated',
    'period.separated': 'Period separated',
    'Period.Separated': 'Period separated',
    CamelWithSomeALLCaps: 'Camel with some all caps',
    CamelWithADoubleUpper: 'Camel with a double upper',
  }

  for (const [slug, expected] of Object.entries(cases)) {
    test(slug, () => {
      expect(slugToName(slug)).toBe(expected)
    })
  }
})

describe('commaSeparatedList', () => {
  expect(commaSeparatedList([])).toBe('')
  expect(commaSeparatedList(['one'])).toBe('one')
  expect(commaSeparatedList(['one', 'two'])).toBe('one or two')
  expect(commaSeparatedList(['one', 'two', 'three'])).toBe('one, two, or three')
  expect(commaSeparatedList(['one', 'two', 'three'], 'and')).toBe(
    'one, two, and three'
  )
})
