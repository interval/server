import { expect } from '@playwright/test'
import { atLeastVersion, consoleUrl } from '../_setup'
import { test } from '../_fixtures'

test('re-connects on server restart', async ({
  transactions,
  request,
  page,
}) => {
  test.skip(
    !process.env.TEST_RECONNECT,
    'Skipping reconnect test, run `yarn test:reconnect` to test it alone'
  )
  test.slow()
  // go to dashboard
  await page.goto(await consoleUrl())
  // start a transaction
  await transactions.run('auto-reconnect')

  // fill and continue
  await page.click('text=First name')
  await page.fill('input[type="text"]', 'Test')

  // trigger server restart
  await request.get(`/api/system/reboot`)

  await expect(
    page.locator('text=The connection to Interval was lost.')
  ).toBeVisible()

  await expect(page.locator('text=First name')).toBeVisible({ timeout: 20_000 })

  await page.fill('input[type="text"]', 'Test2')
  await page.locator('button:has-text("Continue")').click()

  await page.click('text=Last name')
  await page.fill('input[type="text"]', 'Runner')
  await page.locator('button:has-text("Continue")').click()

  await transactions.expectSuccess()
})

test('Client reconnects on Interval restart', async ({
  transactions,
  page,
}) => {
  test.skip(
    !!process.env.SDK_VERSION &&
      process.env.SDK_VERSION !== 'main' &&
      !atLeastVersion('1.4.0')
  )
  // go to dashboard
  await page.goto(await consoleUrl())
  // start a transaction
  await transactions.run('io.input.number')

  await page.locator('input[inputmode="numeric"]').last().fill('12')
  await transactions.continue()

  await expect(page.locator('text=Enter a second number')).toBeVisible()
  await page.locator('input[inputmode="numeric"]').last().fill('20')

  await page.click('[data-pw-command-bar-toggle]')
  await page.click(
    '[data-pw-command-bar-results] [role="option"]:has-text("Simulate Interval restart")'
  )

  await transactions.continue()

  await transactions.expectSuccess({
    num1: 12,
    num2: 20,
    sum: 32,
  })
})
