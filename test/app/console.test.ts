import { consoleUrl } from '../_setup'
import { test } from '../_fixtures'

test.describe.parallel('Console tests', () => {
  test('New transaction', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('io.input.text')

    await page.click('text=First name')
    await page.fill('input[type="text"]', 'Interval')
    await transactions.continue()
    await transactions.expectSuccess()
    await page.click('text=New transaction')

    await page.click('text=First name')
    await page.fill('input[type="text"]', 'Interval')
    await transactions.continue()
    await transactions.expectSuccess()
  })
})
