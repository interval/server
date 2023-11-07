import { isSlugValid } from '~/utils/validate'
import { generateSlug, getCollisionSafeSlug } from '~/server/utils/slugs'

describe('generateSlug', () => {
  test('strips invalid chars', () => {
    const inputs = ['foo', 'foo bar', 'foo~!$/bar']

    for (const input of inputs) {
      expect(isSlugValid(generateSlug(input))).toBe(true)
    }
  })

  test('makes unique', () => {
    expect(
      getCollisionSafeSlug(generateSlug('slug exists'), [
        'slug-exists',
        'slug-exists-as-prefix',
        'existing',
      ])
    ).toBe('slug-exists-3')
  })
})
