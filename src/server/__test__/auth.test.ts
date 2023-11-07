import { generateKey } from '../auth'

describe('generateKey', () => {
  const user = {
    firstName: 'Something-complicated and long',
  }

  test('environments', () => {
    expect(generateKey(user, 'DEVELOPMENT')).toMatch(/_dev_/)

    expect(generateKey(user, 'PRODUCTION')).toMatch(/^live_/)
  })

  test('name prefix cleans name', () => {
    expect(generateKey(user, 'DEVELOPMENT')).toMatch(
      /somethingcomplicatedandlong_dev_/
    )
  })
})
