import { expect } from '@playwright/test'
import path from 'path'
import { consoleUrl } from '../_setup'
import { test } from '../_fixtures'

test.skip(
  !!process.env.GHOST_MODE &&
    !!process.env.SDK_VERSION &&
    process.env.SDK_VERSION < '0.17.0'
)

test.describe.serial('Spreadsheet', () => {
  test('manual', async ({ page, transactions }) => {
    test.skip()
    // The page.keyboard API is unreliable, especially in CI
    // It should be avoided in most circumstances
    await page.goto(await consoleUrl())
    await transactions.run('spreadsheet')
    await page.click('text=Enter manually')
    await page.waitForTimeout(100)
    await page.locator('td').nth(0).click()
    await page.keyboard.type('A string')
    await expect(page.locator('text="A string"')).toBeVisible()
    await page.locator('td').nth(2).click()
    await page.keyboard.type('another string')
    await expect(page.locator('text="another string"')).toBeVisible()
    await page.locator('input[type="checkbox"]').click()
    await expect(page.locator('input[type="checkbox"]')).toBeChecked()

    await transactions.continue()
    await transactions.expectValidationError(
      'There are one or more issues with the data you entered'
    )

    await page.waitForTimeout(100)
    await page.locator('td').nth(2).click()
    await page.keyboard.type('23')
    await expect(page.locator('text="23"')).toBeVisible()
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)

    await transactions.expectNoValidationError(
      'There are one or more issues with the data you entered'
    )

    await transactions.continue()
    await transactions.expectSuccess({
      string: 'A string',
      number: 23,
      boolean: true,
    })
  })

  test('paste', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('spreadsheet')

    await page.click('text=Paste data')
    await page.keyboard.insertText(
      'A,optionalString,number,boolean\n,,23,1\nx,x,0,0'
    )
    await page.click('text="Next"')
    await page.click('text="Import"')

    await transactions.continue()
    await transactions.expectValidationError(
      'There are one or more issues with the data you entered'
    )

    await page.click('text=Enter manually')
    await page.locator('td').nth(0).click()
    await page.keyboard.type('A string')
    await expect(page.locator('text="A string"')).toBeVisible()

    await page.keyboard.press('Enter')
    await page.locator('tbody tr').nth(1).locator('td').nth(0).click()
    await page.keyboard.type('Another string')
    await expect(page.locator('text="Another string"')).toBeVisible()
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)

    await transactions.expectNoValidationError(
      'There are one or more issues with the data you entered'
    )

    await transactions.continue()
    await transactions.expectSuccess({
      string: 'A string',
      number: 23,
      boolean: true,
    })
  })

  test('upload', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('spreadsheet')

    const [filechooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('text="Upload CSV"'),
    ])

    await filechooser.setFiles(path.resolve('test/data/spreadsheet.csv'))
    await page.click('text="Import"')
    await transactions.continue()
    await transactions.expectSuccess({
      string: 'A string',
      number: 23,
      boolean: true,
    })
  })
})
