import { expect } from '@playwright/test'
import { atLeastVersion, consoleUrl, isAppendUIEnabled } from '../_setup'
import { test } from '../_fixtures'

import {
  bigData,
  denseData,
  basicData,
  mockColumns,
  denseColumns,
} from '../data/table'
import {
  applyColumns,
  applyStringColumns,
  checkTable,
  checkTableEdges,
  testDownload,
} from '../utils/table'

test.skip(!!process.env.SDK_VERSION && process.env.SDK_VERSION < '0.11.0')
test.skip(
  !!process.env.GHOST_MODE &&
    !!process.env.SDK_VERSION &&
    process.env.SDK_VERSION < '0.17.0'
)

test.describe('io.display.table', () => {
  test('empty', async ({ page, transactions }) => {
    test.skip(!!process.env.SDK_VERSION && process.env.SDK_VERSION < '0.26.0')

    await page.goto(await consoleUrl())
    await transactions.navigate('tables')
    await transactions.run('tables/empty')

    if (isAppendUIEnabled) {
      await expect(page.locator('text=There are no items')).toHaveCount(2)
    } else {
      await expect(page.locator('text=There are no items')).toBeVisible()
      await transactions.continue()
      await expect(page.locator('text=There are no items')).toBeVisible()
    }
  })

  test('less_than_page_size', async ({ page, transactions }) => {
    test.skip(!!process.env.SDK_VERSION && process.env.SDK_VERSION < '0.26.0')

    await page.goto(await consoleUrl())
    await transactions.navigate('tables')
    await transactions.run('tables/less_than_page_size')

    if (isAppendUIEnabled) {
      await expect(page.locator('text=1 - 5 of 5')).toHaveCount(4)
      await expect(page.locator(`text=${basicData[0].string}`)).toHaveCount(2)
    } else {
      await expect(page.locator('text=1 - 5 of 5')).toHaveCount(2)
      await expect(page.locator(`text=${basicData[0].string}`)).toBeVisible()

      await transactions.continue()

      await expect(page.locator('text=1 - 5 of 5')).toHaveCount(2)
      await expect(page.locator(`text=${basicData[0].string}`)).toBeVisible()
    }
  })

  test('equal_to_page_size', async ({ page, transactions }) => {
    test.skip(!!process.env.SDK_VERSION && process.env.SDK_VERSION < '0.26.0')

    await page.goto(await consoleUrl())
    await transactions.navigate('tables')
    await transactions.run('tables/equal_to_page_size')

    if (isAppendUIEnabled) {
      await expect(page.locator('text=1 - 5 of 5')).toHaveCount(4)
      await expect(page.locator(`text=${basicData[0].string}`)).toHaveCount(2)
    } else {
      await expect(page.locator('text=1 - 5 of 5')).toHaveCount(2)
      await expect(page.locator(`text=${basicData[0].string}`)).toBeVisible()

      await transactions.continue()

      await expect(page.locator('text=1 - 5 of 5')).toHaveCount(2)
      await expect(page.locator(`text=${basicData[0].string}`)).toBeVisible()
    }
  })

  test('greater_than_page_size', async ({ page, transactions }) => {
    test.skip(!!process.env.SDK_VERSION && process.env.SDK_VERSION < '0.26.0')

    await page.goto(await consoleUrl())
    await transactions.navigate('tables')
    await transactions.run('tables/greater_than_page_size')

    if (isAppendUIEnabled) {
      await expect(page.locator('text=1 - 5 of 10')).toHaveCount(4)
      await expect(page.locator(`text=${basicData[0].string}`)).toHaveCount(2)
      await expect(page.locator(`text=${basicData[5].string}`)).toHaveCount(0)
    } else {
      await expect(page.locator('text=1 - 5 of 10')).toHaveCount(2)
      await expect(page.locator(`text=${basicData[0].string}`)).toBeVisible()
      await expect(page.locator(`text=${basicData[5].string}`)).toHaveCount(0)

      await transactions.continue()

      await expect(page.locator('text=1 - 5 of 10')).toHaveCount(2)
      await expect(page.locator(`text=${basicData[0].string}`)).toBeVisible()
      await expect(page.locator(`text=${basicData[5].string}`)).toHaveCount(0)
    }
  })

  test('auto_columns', async ({ page, transactions }) => {
    test.skip(!!process.env.SDK_VERSION && process.env.SDK_VERSION < '0.26.0')

    await page.goto(await consoleUrl())
    await transactions.navigate('tables')
    await transactions.run('tables/auto_columns')

    if (isAppendUIEnabled) {
      await expect(
        page.locator('[role="columnheader"]:has-text("string")')
      ).toHaveCount(2)
      await expect(
        page.locator('[role="columnheader"]:has-text("number")')
      ).toHaveCount(2)
      await expect(
        page.locator('[role="columnheader"]:has-text("float")')
      ).toHaveCount(2)
    } else {
      await expect(
        page.locator('[role="columnheader"]:has-text("string")')
      ).toBeVisible()
      await expect(
        page.locator('[role="columnheader"]:has-text("number")')
      ).toBeVisible()
      await expect(
        page.locator('[role="columnheader"]:has-text("float")')
      ).toBeVisible()

      await transactions.continue()

      await expect(
        page.locator('[role="columnheader"]:has-text("string")')
      ).toBeVisible()
      await expect(
        page.locator('[role="columnheader"]:has-text("number")')
      ).toBeVisible()
      await expect(
        page.locator('[role="columnheader"]:has-text("float")')
      ).toBeVisible()
    }
  })

  test('specific_columns', async ({ page, transactions }) => {
    test.skip(!!process.env.SDK_VERSION && process.env.SDK_VERSION < '0.26.0')

    await page.goto(await consoleUrl())
    await transactions.navigate('tables')
    await transactions.run('tables/specific_columns')

    if (isAppendUIEnabled) {
      await expect(
        page.locator('[role="columnheader"]:has-text("string")')
      ).toHaveCount(2)
      await expect(
        page.locator('[role="columnheader"]:has-text("number")')
      ).toHaveCount(2)
      await expect(
        page.locator('[role="columnheader"]:has-text("float")')
      ).toBeHidden()
    } else {
      await expect(
        page.locator('[role="columnheader"]:has-text("string")')
      ).toBeVisible()
      await expect(
        page.locator('[role="columnheader"]:has-text("number")')
      ).toBeVisible()
      await expect(
        page.locator('[role="columnheader"]:has-text("float")')
      ).toBeHidden()

      await transactions.continue()

      await expect(
        page.locator('[role="columnheader"]:has-text("string")')
      ).toBeVisible()
      await expect(
        page.locator('[role="columnheader"]:has-text("number")')
      ).toBeVisible()
      await expect(
        page.locator('[role="columnheader"]:has-text("float")')
      ).toBeHidden()
    }
  })

  test('async_get_data', async ({ page, transactions }) => {
    test.skip(!atLeastVersion('0.31.0'))

    await page.goto(await consoleUrl())
    await transactions.navigate('tables')
    await transactions.run('tables/async_get_data')

    const table = page.locator('.iv-table')
    await checkTable(table, bigData, { numRecordsToCheck: 100 })

    if (!isAppendUIEnabled) {
      await transactions.continue()
    }

    await transactions.expectSuccess()
  })

  test('Basic', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('io.display.table')

    const labels = ['Basic auto', 'Dense auto']
    const expectedData = [basicData, denseData]

    for (let i = 0; i < expectedData.length; i++) {
      const data = expectedData[i]

      let table = page.locator('.iv-table')
      if (isAppendUIEnabled) {
        table = table.nth(i)
      }

      await expect(table).toBeVisible({ timeout: 10_000 })

      await checkTable(table, data)
      await testDownload(page, table, data)

      if (!isAppendUIEnabled) {
        await transactions.continue()
      }
    }

    await transactions.expectSuccess()
  })

  test('Columns', async ({ page, transactions }) => {
    test.skip(!!process.env.SDK_VERSION && process.env.SDK_VERSION < '0.12.0')
    await page.goto(await consoleUrl())
    await transactions.run('tableColumns')

    const labels = ['Basic columns', 'Dense columns']
    const expectedData = [
      applyColumns(basicData, mockColumns),
      applyColumns(denseData, denseColumns),
    ]

    if (atLeastVersion('0.21.0')) {
      labels.push('Dense shorthand columns')
      expectedData.push(
        applyStringColumns(denseData, [
          'index',
          'firstName',
          'lastName',
          'email',
          'address',
        ])
      )
    }

    for (let i = 0; i < expectedData.length; i++) {
      const label = labels[i]
      const data = expectedData[i]

      let table = page.locator('.iv-table')
      if (isAppendUIEnabled) {
        table = table.nth(i)
      }

      await checkTable(table, data)
      await testDownload(page, table, data)

      if (!isAppendUIEnabled) {
        await transactions.continue()
      }
    }

    await transactions.expectSuccess()
  })

  test('Menus', async ({ page, transactions }) => {
    test.skip(!!process.env.SDK_VERSION && process.env.SDK_VERSION < '0.25.0')
    await page.goto(await consoleUrl())
    await transactions.run('io.display.table')

    await page
      .locator('[role="row"]')
      .first()
      .locator('button:has-text("Open options")')
      .click()

    expect(page.locator('text=Disabled item 0')).toBeDisabled()

    await expect(page.locator('text=External item 0')).toHaveAttribute(
      'href',
      'https://interval.com'
    )

    await page.locator('text=Action item 0').click()
    await expect(page.locator('text="This action (relative)"')).toBeVisible()
  })

  test('Vertical', async ({ page, transactions }) => {
    test.skip(!!process.env.SDK_VERSION && process.env.SDK_VERSION < '0.14.0')
    await page.goto(await consoleUrl())
    await transactions.run('verticalTable')

    const expectedData = [basicData, applyColumns(basicData, mockColumns)]

    for (let i = 0; i < expectedData.length; i++) {
      const data = expectedData[i]

      let table = page.locator('.iv-table')
      if (isAppendUIEnabled) {
        table = table.nth(i)
      }

      await checkTable(table, data, { orientation: 'vertical' })

      if (!isAppendUIEnabled) {
        await transactions.continue()
      }
    }

    await transactions.expectSuccess()
  })

  test('Big table', async ({ page, transactions }) => {
    test.slow()

    await page.goto(await consoleUrl())
    await transactions.run('bigTable')

    const table = page.locator('.iv-table')
    await checkTableEdges(table, bigData)
    await testDownload(page, table, bigData, 'simple')

    if (!isAppendUIEnabled) {
      await transactions.continue()
    }

    await transactions.expectSuccess()
  })
})
