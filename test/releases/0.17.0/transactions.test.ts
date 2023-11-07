import { expect } from '@playwright/test'
import { consoleUrl } from '../../_setup'
import { test } from '../../_fixtures'
import { dateTimeFormatter } from '~/utils/formatters'
import { inputDate, inputInvalidDate, inputTime } from '../../utils/date'

test.skip(process.env.SDK_VERSION !== '0.17.0')

test.describe.parallel('Basic transactions tests', () => {
  test('context', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('context')
    await page.goto(page.url() + '?message=Hello')
    await transactions.expectSuccess({
      user: 'Test Runner',
      message: 'Hello',
      environment: 'development',
    })
  })

  test('io.display.heading', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('io.display.heading')
    await expect(page.locator('text=io.display.heading result')).toBeVisible()
    await transactions.continue()
    await transactions.expectSuccess()
  })

  test('io.group', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('io.group')
    await expect(page.locator('text=First item')).toBeVisible()
    await expect(page.locator('text=Second item')).toBeVisible()
    await transactions.continue()
    await transactions.expectSuccess()
  })

  test('io.display.object', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('io.display.object')
    await expect(page.locator('dt:has-text("isTrue")')).toBeVisible()
    await expect(page.locator('dd:has-text("true")')).toBeVisible()
    await expect(page.locator('dt:has-text("name")')).toBeVisible()
    await expect(page.locator('dd:has-text("Interval")')).toBeVisible()
    await expect(page.locator('summary:has-text("longList")')).toBeVisible()
    await expect(page.locator('dd:has-text("Item 99")')).toBeHidden()
    await page.locator('summary:has-text("longList")').click()
    await expect(page.locator('dd:has-text("Item 99")')).toBeVisible()
    await transactions.continue()
    await transactions.expectSuccess()
  })

  test('io.input.richText', async ({ page, transactions }) => {
    test.slow() // Lazy loading markdown code block can sometimes take a while in dev
    await page.goto(await consoleUrl())
    await transactions.run('io.input.richText')
    await expect(page.locator('text=Email body')).toBeVisible()

    await transactions.expectValidationErrorFromSubmit()

    const input = page.locator('.ProseMirror')

    await page.selectOption('select[aria-label="Heading level"]', '1')
    await input.type('Heading 1')
    await input.press('Enter')
    await page.click('button[aria-label="Toggle italic"]')
    await input.type('Emphasis')
    await input.press('Enter')
    await page.click('button[aria-label="Toggle italic"]')
    await page.click('button[aria-label="Toggle underline"]')
    await input.type('Underline')
    await page.click('button[aria-label="Toggle underline"]')

    await transactions.continue()
    await expect(page.locator('h2:has-text("You entered:")')).toBeVisible()
    expect(await page.locator('pre code').textContent()).toBe(
      `<h1>Heading 1</h1><p><em>Emphasis</em></p><p><u>Underline</u></p>\n`
    )
    await transactions.continue()
    await transactions.expectSuccess()
  })

  test('io.input.text', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('io.input.text')

    await transactions.expectValidationErrorFromSubmit()

    await page.click('text=First name')
    await page.fill('input[type="text"]', 'Interval')
    await transactions.continue()
    await transactions.expectSuccess({
      name: 'Interval',
    })
  })

  test('io.input.email', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('io.input.email')

    await transactions.expectValidationErrorFromSubmit()

    await page.click('text=Email address')
    await page.keyboard.type('notanemail')
    await transactions.continue()
    // the browser's built-in type="email" validator will prevent continuing

    await page.click('text=Email address')
    await page.keyboard.type('hello@interval.com')
    await transactions.continue()
    await transactions.expectSuccess({
      email: 'hello@interval.com',
    })
  })

  test.describe('io.input.number', () => {
    test('Basic', async ({ page, transactions }) => {
      await page.goto(await consoleUrl())
      await transactions.run('io.input.number')

      await transactions.expectValidationErrorFromSubmit()

      await page.click('text=Enter a number')
      await page.fill('input[inputmode="numeric"]', '12')
      await transactions.continue()

      await page.click('text=Enter a second number')
      await page.fill('input[inputmode="numeric"]', '7')
      await transactions.continue()
      await transactions.expectValidationError(
        'Please enter a number greater than or equal to 13.'
      )

      await page.fill('input[inputmode="numeric"]', '13')
      await transactions.continue()
      await transactions.expectSuccess()
    })

    test('Currency', async ({ page, transactions }) => {
      await page.goto(await consoleUrl())
      await transactions.run('currency')

      await page.locator('input').nth(0).fill('9.99')
      await page.locator('input').nth(1).fill('10.001')
      await page.locator('input').nth(2).fill('12.345')
      await transactions.continue()
      await transactions.expectValidationError(
        'Please enter a number greater than or equal to 10.'
      )
      await transactions.expectValidationError(
        'Please enter a number with up to 2 decimal places.'
      )
      await page.locator('input').nth(0).fill('10')
      await page.locator('input').nth(1).fill('10.01')

      await transactions.continue()
      await transactions.expectSuccess({
        usd: 10,
        eur: 10.01,
        jpy: 12.345,
      })
    })
  })

  test('io.select.multiple', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('io.select.multiple')

    await expect(page.locator('text=Select zero or more')).toBeVisible()
    await page.click('input[type="checkbox"][value="A"]')
    await page.click('input[type="checkbox"][value="B"]')
    await page.click('input[type="checkbox"][value="C"]')
    await transactions.continue()

    await expect(
      page.locator('text=Optionally modify the selection')
    ).toBeVisible()
    await expect(
      page.locator('input[type="checkbox"][value="A"]')
    ).toBeChecked()
    await expect(
      page.locator('input[type="checkbox"][value="B"]')
    ).toBeChecked()
    await expect(
      page.locator('input[type="checkbox"][value="C"]')
    ).toBeChecked()

    await transactions.continue()
    await transactions.expectValidationError(
      'Please make no more than 2 selections.'
    )

    await page.click('input[type="checkbox"][value="A"]')
    await page.click('input[type="checkbox"][value="B"]')
    await page.click('input[type="checkbox"][value="C"]')
    await transactions.continue()
    await transactions.expectValidationError(
      'Please make at least 1 selection.'
    )

    await page.click('input[type="checkbox"][value="A"]')
    await page.click('input[type="checkbox"][value="C"]')
    await transactions.continue()

    await transactions.expectSuccess({
      A: true,
      B: false,
      C: true,
    })
  })

  test('io.select.table', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('io.select.table')

    await expect(page.locator('text=Select some rows')).toBeVisible()
    await transactions.continue()
    await transactions.expectValidationError(
      'Please make at least 1 selection.'
    )

    await page.locator('[role="cell"]:has-text("Orange")').click()
    await page.locator('[role="cell"]:has-text("Ryan")').click()
    await page.locator('[role="cell"]:has-text("Dan")').click()
    await transactions.continue()
    await transactions.expectValidationError(
      'Please make no more than 2 selections.'
    )

    await page.locator('[role="cell"]:has-text("Ryan")').click()
    await page.locator('[role="cell"]:has-text("Dan")').click()
    await transactions.continue()

    expect(await page.locator('pre code').textContent()).toBe(
      `[{"firstName":"Jacob","lastName":"Mischka","favoriteColor":"Orange"}]\n`
    )
    await transactions.continue()
    await transactions.expectSuccess()
  })

  test('io.select.single', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('io.select.single')

    await transactions.expectValidationErrorFromSubmit()

    const label = page.locator('label:has-text("Choose role")')
    const inputId = await label.getAttribute('for')
    const input = page.locator(`#${inputId}`)
    await input.click()
    await page.locator('.iv-select__menu div div:has-text("Admin")').click()
    expect(
      await page.locator('.iv-select__single-value').textContent()
    ).toEqual('Admin')

    await input.fill('ed')
    await input.press('Enter')
    await transactions.continue()
    await expect(page.locator('text=You selected: Editor')).toBeVisible()

    await transactions.continue()
    await transactions.expectSuccess()
  })

  test('search', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('search')

    const label = page.locator('label:has-text("Find something")')
    const inputId = await label.getAttribute('for')
    const input = page.locator(`#${inputId}`)

    async function searchAndSelect(query: string) {
      await input.click()
      await input.fill(query)
      await expect(page.locator('text="Loading..."')).toBeVisible()
      await expect(page.locator('text="Loading..."')).toBeHidden()
      await page.click(
        `[data-pw-search-result]:has-text("${query}"):nth-child(1)`
      )
      await expect(
        page.locator(`.iv-select__single-value:has-text("${query}")`)
      ).toBeVisible()
      await expect(
        page.locator(
          `[data-pw-search-result]:has-text("${query}"):nth-child(1)`
        )
      ).toBeHidden()
    }

    await searchAndSelect('Viewer')

    await transactions.continue()
    await transactions.expectSuccess({
      label: 'Viewer',
      value: 'c',
      extraData: 3,
    })
  })

  test('date', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('date')

    await transactions.expectValidationErrorFromSubmit()

    await inputInvalidDate(page, transactions)
    await inputDate(page)
    await transactions.continue()
    await transactions.expectSuccess({
      year: 2022,
      month: 2,
      day: 25,
      jsDate: dateTimeFormatter.format(new Date(2022, 1, 25, 0, 0, 0, 0)),
    })
  })

  test('time', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('time')

    await transactions.expectValidationErrorFromSubmit()

    await inputTime(page)
    await transactions.continue()
    await transactions.expectSuccess({
      hour: 14,
      minute: 36,
    })
  })

  test('error', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('error')
    await page.click('text=First name')
    await page.fill('input[type="text"]', 'Interval')
    await transactions.continue()
    await transactions.expectFailure({
      message: 'Unauthorized',
    })
  })

  test('logs', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('logs')

    await transactions.expectSuccess()
    const logs = page.locator('[data-pw-transaction-logs] div')
    for (let i = 0; i < 10; i++) {
      await expect(logs.nth(i)).toContainText(`Log number ${i}`)
    }
  })

  test('optional', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('optional')

    const fields = [
      'Text',
      'Email',
      'Number',
      'Rich text',
      'Date',
      'Time',
      'Datetime',
    ]

    for (const field of fields) {
      if (field === 'Rich text') {
        await page.locator(`div.ProseMirror`).click()
      } else {
        await page.locator(`text=${field}`).click()
      }
      await page.locator(':focus').evaluate(e => e.blur())
      await expect(page.locator('[data-pw="input-error"]')).not.toBeVisible()
      await transactions.continue()
    }

    await transactions.expectSuccess()
  })

  test('Loading', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('loading')

    await expect(
      page.locator('[data-pw-label]:has-text("Bare title")')
    ).toBeVisible()
    await expect(page.locator('[data-pw-description]')).toBeHidden()

    await expect(
      page.locator('[data-pw-description]:has-text("Description text")')
    ).toBeVisible()

    await expect(page.locator('[data-pw-description]')).toBeHidden()
    await expect(page.locator('[data-pw-label]')).toBeHidden()

    await expect(
      page.locator('[data-pw-description]:has-text("Description only")')
    ).toBeVisible()
    await expect(page.locator('[data-pw-label]')).toBeHidden()

    await expect(
      page.locator('[data-pw-label]:has-text("With progress")')
    ).toBeVisible()

    for (let i = 0; i <= 5; i++) {
      await expect(page.locator(`text=Completed ${i} of 5`)).toBeVisible()
    }
  })
})

test.describe.serial('datetime', () => {
  test('Default value', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('datetime_default')

    // Test default value
    await transactions.continue()
    await transactions.expectSuccess({
      year: 2020,
      month: 6,
      day: 23,
      hour: 13,
      minute: 25,
      jsDate: dateTimeFormatter.format(new Date(2020, 5, 23, 13, 25)),
    })
  })

  test('Basic input', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('datetime')

    await transactions.expectValidationErrorFromSubmit()

    await inputDate(page)
    await inputTime(page)
    await transactions.continue()
    await transactions.expectSuccess({
      year: 2022,
      month: 2,
      day: 25,
      hour: 14,
      minute: 36,
      jsDate: dateTimeFormatter.format(new Date(2022, 1, 25, 14, 36, 0, 0)),
    })
  })
})
