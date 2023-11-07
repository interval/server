import { expect } from '@playwright/test'
import Interval, { IntervalActionHandler } from '@interval/sdk/dist'
import { prisma, config, dashboardUrl, isAppendUIEnabled } from '../_setup'
import { test } from '../_fixtures'

test.skip(!!process.env.SDK_VERSION && process.env.SDK_VERSION !== 'main')
test.skip(!!process.env.GHOST_MODE)

const handler: IntervalActionHandler = async io => {
  const first = await io.input.text('First input')
  const second = await io.input.text('Second input')

  return { first, second }
}

test.describe('Live actions', () => {
  let interval: Interval | undefined

  test.beforeAll(async () => {
    interval = new Interval({
      apiKey: config.liveApiKey,
      logLevel: 'debug',
      endpoint: `${config.url.replace('http', 'ws')}/websocket`,
      routes: {
        nonBackgroundable: handler,
        backgroundable: {
          backgroundable: true,
          handler,
        },
      },
    })

    interval.listen()

    const user = await prisma.user.findUnique({
      where: {
        email: config.login.email,
      },
      include: {
        organizations: true,
      },
    })

    if (!user) throw new Error('No test runner')
  })

  test('Backgroundable', async ({ page, transactions }) => {
    await page.goto(await dashboardUrl())
    await transactions.run('backgroundable')
    await page.fill('input[type="text"]', 'First')
    await transactions.continue()
    await page.goto(await dashboardUrl())
    await page.click('text=Continue')
    await expect(page.locator('text=Second input')).toBeVisible()
    await page.fill('input[type="text"]', 'Second')
    await transactions.continue()
    await transactions.expectSuccess({
      first: 'First',
      second: 'Second',
    })
  })

  test('Non-backgroundable', async ({ page, transactions }) => {
    await page.goto(await dashboardUrl())
    await transactions.run('nonBackgroundable')
    await page.fill('input[type="text"]', 'First')
    await transactions.continue()
    await page.goto(await dashboardUrl())
    await expect(page.locator('text=Continue')).toBeHidden()
  })

  test('Transparent URL in progress', async ({ page, transactions }) => {
    await page.goto(await dashboardUrl())
    await transactions.run('nonBackgroundable')
    expect(page.url()).toBe(await dashboardUrl('actions/nonBackgroundable'))
  })

  test('New transaction', async ({ page, transactions }) => {
    await page.goto(await dashboardUrl())
    await transactions.run('nonBackgroundable')
    await page.fill('input[type="text"]', 'First')
    await transactions.continue()
    await expect(page.locator('text=Second input')).toBeVisible()
    await page
      .locator('input[type="text"]')
      .nth(isAppendUIEnabled ? 1 : 0)
      .fill('Second')
    await transactions.continue()
    await transactions.expectSuccess()

    await page.reload()
    await page.fill('input[type="text"]', 'First')
    await transactions.continue()
    await expect(page.locator('text=Second input')).toBeVisible()
    await page
      .locator('input[type="text"]')
      .nth(isAppendUIEnabled ? 1 : 0)
      .fill('Second')
    await transactions.continue()
    await transactions.expectSuccess()
  })
})
