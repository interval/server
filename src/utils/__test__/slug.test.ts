import { generateSlug } from '~/server/utils/slugs'

describe('generateSlug', () => {
  const cases = {
    Word: 'word',
    'Basic words': 'basic-words',
    'Double -- hyphen': 'double--hyphen',
    'has "double quotes"': 'has-double-quotes',
    "has 'single quotes'": 'has-single-quotes',
    '- Starts with hyphen': 'starts-with-hyphen',
    'Ends-with-hyphen-': 'ends-with-hyphen',
    'More + Advanced thing :)': 'more-advanced-thing',
  }

  for (const [start, end] of Object.entries(cases)) {
    test(start, () => {
      expect(generateSlug(start)).toBe(end)
    })
  }
})
