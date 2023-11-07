import { test } from '../_fixtures'
import { appUrl, dashboardUrl, prisma } from '../_setup'
import { expect } from '@playwright/test'
import { createUser } from '~/server/user'
import { enrollMfa } from '~/server/auth'
import { User } from '@prisma/client'

test.skip(!!process.env.SDK_VERSION && process.env.SDK_VERSION !== 'main')
test.skip(!!process.env.GHOST_MODE)

const userConfig = {
  firstName: 'MFA',
  lastName: 'Tester',
  email: 'test-mfa@interval.com',
  password: 'password',
}

test.beforeAll(async () => {
  let user: Pick<User, 'id' | 'mfaId' | 'email'> | null =
    await prisma.user.findUnique({
      where: { email: userConfig.email },
    })

  if (!user) {
    try {
      user = await createUser({
        data: userConfig,
        password: userConfig.password,
      })
    } catch (err) {
      console.error('Failed creating MFA user', err)
      throw err
    }
  }

  if (!user.mfaId) {
    const response = await enrollMfa(user)
    await prisma.user.update({
      where: { id: user.id },
      data: { mfaId: response.id },
    })
  }
})

test('Requires MFA code after login', async ({ browser }) => {
  const context = await browser.newContext()
  await context.clearCookies()
  const page = await context.newPage()
  await page.goto(appUrl('/login'))
  await page.fill('input[name="email"]', userConfig.email)
  await page.click('button[type="submit"]')
  await page.fill('input[name="password"]', userConfig.password)
  await page.click('button[type="submit"]')
  await page.waitForNavigation()
  await page.waitForTimeout(500)

  expect(page.url()).toMatch(/\/verify-mfa$/)
  await page.goto(await dashboardUrl())
  await page.waitForNavigation()
  await page.waitForTimeout(500)
  expect(page.url()).toMatch(/\/verify-mfa$/)
  await context.close()
})
