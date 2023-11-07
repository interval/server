import path from 'path'
import fs from 'fs'
import { expect } from '@playwright/test'
import { sleep, consoleUrl } from '../../_setup'
import { test } from '../../_fixtures'
import {
  dateFormatter,
  timeFormatter,
  dateTimeFormatter,
} from '~/utils/formatters'
import { inputDate, inputTime } from '../../utils/date'
import { getActionUrl } from '~/utils/actions'

test.skip(process.env.SDK_VERSION !== '0.28.0')

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

    const button = page.locator('button:has-text("Custom label")')
    await expect(button).toBeVisible()
    await expect(button).toHaveClass(/bg-red-500/)
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

  test('io.display.image', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('io.display.image')

    await expect(page.locator('text=Image via url')).toBeVisible()
    let img = page.locator('img[data-pw-display-image]')
    await expect(img).toBeVisible()
    expect(img).toHaveAttribute(
      'src',
      'https://media.giphy.com/media/26ybw6AltpBRmyS76/giphy.gif'
    )
    expect(img).toHaveClass(/w-img-medium/)
    expect(await img.getAttribute('alt')).toBeTruthy()
    await transactions.continue()

    await expect(page.locator('text=Image via buffer')).toBeVisible()
    img = page.locator('img[data-pw-display-image]')
    await expect(img).toBeVisible()
    expect(await img.getAttribute('src')).toMatch(/^data:/)
    expect(await img.getAttribute('alt')).toBeTruthy()
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
    const input = page.locator('input[type="text"]')
    await input.fill('Int')
    await transactions.continue()
    const validationErrorMessage =
      'Please enter a value with between 5 and 20 characters.'
    await transactions.expectValidationError(validationErrorMessage)

    await input.fill('Interval Interval Interval Interval')
    await transactions.continue()
    await transactions.expectValidationError(validationErrorMessage)

    await input.fill('Interval')
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

  test('io.input.url', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('io.input.url')

    await transactions.expectValidationErrorFromSubmit()

    await page.click('text=Enter a URL')
    const input = page.locator('input[type="text"]')
    await input.fill('not a url')
    await transactions.continue()
    const validationErrorMessage = 'Please enter a valid URL.'
    await transactions.expectValidationError(validationErrorMessage)

    await input.fill('https://interval.com/?isTest=true&foo=bar')
    await transactions.continue()

    const secureInput = page.locator('input[type="text"]')
    await secureInput.fill('http://interval.com')
    await transactions.continue()
    await transactions.expectValidationError('The URL must begin with https.')

    await secureInput.fill('https://interval.com')
    await transactions.continue()
    await transactions.expectSuccess({
      url: 'https://interval.com/?isTest=true&foo=bar',
      secureUrl: 'https://interval.com',
    })
  })

  test('io.select.multiple', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('io.select.multiple')

    const date = new Date(2022, 6, 20).toString()

    await expect(page.locator('text=Select zero or more')).toBeVisible()
    await page.click(`input[type="checkbox"][value="${date}"]`)
    await page.click('input[type="checkbox"][value="true"]')
    await page.click('input[type="checkbox"][value="3"]')
    await transactions.continue()

    await expect(
      page.locator('text=Optionally modify the selection')
    ).toBeVisible()
    await expect(
      page.locator(`input[type="checkbox"][value="${date}"]`)
    ).toBeChecked()
    await expect(
      page.locator('input[type="checkbox"][value="true"]')
    ).toBeChecked()
    await expect(
      page.locator('input[type="checkbox"][value="3"]')
    ).toBeChecked()

    await transactions.continue()
    await transactions.expectValidationError(
      'Please make no more than 2 selections.'
    )

    await page.click(`input[type="checkbox"][value="${date}"]`)
    await page.click('input[type="checkbox"][value="true"]')
    await page.click('input[type="checkbox"][value="3"]')
    await transactions.continue()
    await transactions.expectValidationError(
      'Please make at least 1 selection.'
    )

    await page.click(`input[type="checkbox"][value="${date}"]`)
    await page.click('input[type="checkbox"][value="3"]')
    await transactions.continue()

    await transactions.expectSuccess({
      [date]: true,
      true: false,
      '3': true,
      extraData: true,
    })
  })

  test('io.select.table', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('io.select.table')

    await page.locator('input[aria-label="Select all"]').first().click()
    expect(await page.locator(`[role="row"] input:checked`).count()).toBe(4)

    await page.locator('input[aria-label="Select none"]').first().click()
    expect(await page.locator(`[role="row"] input:checked`).count()).toBe(0)

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

    await page.locator('[role="cell"]:has-text("Alex")').click()
    await page.locator('[role="cell"]:has-text("Dan")').click()
    await transactions.continue()
    await transactions.expectSuccess({
      firstName: 'Dan',
      lastName: 'Philibin',
    })
  })

  test('io.select.single', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('io.select.single')

    await transactions.expectValidationErrorFromSubmit()

    await page.click('.iv-select-container')
    await page.locator('.iv-select__menu div div:has-text("Jul")').click()
    await transactions.continue()

    const label = page.locator('label:has-text("Choose custom")')
    const inputId = await label.getAttribute('for')
    const input = page.locator(`#${inputId}`)
    await input.click()
    await page.locator('.iv-select__menu div div:has-text("Admin")').click()
    expect(
      await page.locator('.iv-select__single-value').textContent()
    ).toEqual('Admin')
    expect(
      await page.locator('.iv-select__single-value').textContent()
    ).toEqual('Admin')

    await input.fill('ed')
    await input.press('Enter')

    await transactions.continue()
    await transactions.expectSuccess({
      basic: dateTimeFormatter.format(new Date(2022, 6, 20)),
      label: 'Editor',
      value: 2,
      extraData: true,
    })
  })

  test('select_invalid_defaults', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('select_invalid_defaults')

    await transactions.expectValidationErrorFromSubmit()
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

    const input = page.locator('.iv-datepicker input[type="text"]')
    await input.fill('12/34/5678')
    await sleep(200) // wait for 100ms delay we apply before showing the popover
    await input.press('Tab')
    await transactions.continue()
    await transactions.expectValidationError('Please enter a valid date.')

    await input.fill('6/23/1997')
    await sleep(200)
    await input.press('Tab')
    await transactions.continue()
    const validationErrorMessage = `Please enter a date between ${dateFormatter.format(
      new Date(2000, 0, 1)
    )} and ${dateFormatter.format(new Date(2022, 11, 30))}.`
    await transactions.expectValidationError(validationErrorMessage)

    await input.fill('1/2/2023')
    await sleep(200)
    await input.press('Tab')
    await transactions.continue()
    await transactions.expectValidationError(validationErrorMessage)

    await input.click()
    await sleep(200)
    await input.fill('02/22/2022')
    await page.locator('.flatpickr-day:has-text("25")').click()
    expect(await input.inputValue()).toBe('02/25/2022')

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

    await expect(page.locator('.iv-datepicker')).toBeVisible()
    const selects = page.locator('.iv-datepicker select')

    const [h, m, ampm] = [selects.nth(0), selects.nth(1), selects.nth(2)]

    await h.selectOption({ value: '8' })
    await h.press('Tab')

    await expect(m).toBeFocused()
    await m.type('36')
    await m.press('Tab')

    await expect(ampm).toBeFocused()
    await ampm.selectOption('pm')

    const startTime = new Date()
    startTime.setHours(8, 30)
    const endTime = new Date()
    endTime.setHours(20, 0)

    await transactions.continue()
    const validationErrorMessage = `Please enter a time between ${timeFormatter.format(
      startTime
    )} and ${timeFormatter.format(endTime)}.`
    await transactions.expectValidationError(validationErrorMessage)

    await h.selectOption({ value: '2' })
    await ampm.selectOption('am')
    await transactions.continue()
    await transactions.expectValidationError(validationErrorMessage)

    await ampm.selectOption('pm')
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

    await expect(page.locator('text="Date"')).toBeVisible()
    await inputDate(page)
    await transactions.continue()
    await expect(page.locator('text="Datetime"')).toBeVisible()
    await inputDate(page)
    await inputTime(page)
    await transactions.continue()
    await page.locator('[role="cell"]:has-text("5")').click()
    await transactions.continue()

    await expect(page.locator('text="Date"')).toBeVisible()
    await expect(page.locator('text=jsDate')).toBeVisible()
    await transactions.continue()
    await expect(page.locator('text="Datetime"')).toBeVisible()
    await expect(page.locator('text=jsDate')).toBeVisible()
    await transactions.continue()
    await transactions.expectSuccess({
      a: 4,
      b: 5,
      c: 6,
    })
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

  test('Notifications', async ({ page, transactions }) => {
    test.skip(!!process.env.GHOST_MODE)

    await page.goto(await consoleUrl())
    await transactions.run('notifications')

    // Wait for notification to come in
    await page.waitForTimeout(200)

    const controlPanel = page.locator('[data-pw-control-panel]')
    const expanded =
      (await controlPanel.getAttribute('data-pw-expanded')) === 'true'
    const selected = await controlPanel.getAttribute('data-pw-selected')

    if (!expanded || selected !== 'Notifications') {
      await controlPanel.locator('[data-pw-tab-id="Notifications"]').click()
    }

    await expect(controlPanel.locator('text=Explicit: Message')).toBeVisible()
    await expect(
      controlPanel.locator(
        'text=Would have sent to alex@interval.com via EMAIL'
      )
    ).toBeVisible()

    await transactions.continue()

    await expect(controlPanel.locator('text=Implicit')).toBeVisible()
    await expect(
      controlPanel.locator('text=Would have sent to test-runner@interval.com')
    ).toBeVisible()
  })

  test('Advanced objects', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('advanced_data')
    await expect(page.locator('dt:has-text("bigInt")')).toBeVisible()
    await expect(page.locator('dd:has-text("5n")')).toBeVisible()
    await expect(page.locator('summary:has-text("map")')).toBeVisible()
    await expect(page.locator('dt:has-text("key 2")')).toBeVisible()
    await expect(page.locator('dd:has-text("2")')).toBeVisible()
    await expect(page.locator('summary:has-text("set")')).toBeVisible()
    await expect(page.locator('dd:has-text("b")')).toBeVisible()
    await expect(page.locator('dd:has-text("c")')).toBeVisible()

    await transactions.continue()
    await transactions.expectResult('5n')
  })

  test.describe('Nested', () => {
    test('hello', async ({ page, transactions }) => {
      await page.goto(await consoleUrl())
      await transactions.navigate('nested')
      await transactions.run('nested/hello')
    })
  })

  test('Malformed', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('malformed')
    await expect(
      page.locator('text=Received invalid message from action.')
    ).toBeVisible()
  })

  test('Bad message', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('badMessage')
    await expect(
      page.locator('text=Waiting to hear from action...')
    ).toBeVisible()
  })

  test('links', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('links')

    const linkTo = 'https://interval.com'

    await page.fill('text=Enter a URL', linkTo)
    await transactions.continue()
    await page.click('text=Start this action over')

    await expect(page.locator('a:has-text("Link to")')).toHaveAttribute(
      'href',
      linkTo
    )
    await expect(
      page.locator('a:has-text("This action (absolute)")')
    ).toHaveAttribute(
      'href',
      getActionUrl({
        orgEnvSlug: 'test-runner',
        slug: 'links',
        mode: 'console',
        absolute: true,
        params: {
          linkTo,
        },
      })
    )
    await expect(
      page.locator('a:has-text("This action (relative)")')
    ).toHaveAttribute(
      'href',
      getActionUrl({
        orgEnvSlug: 'test-runner',
        slug: 'links',
        mode: 'console',
        absolute: false,
        params: {
          linkTo,
        },
      })
    )
  })

  test.describe('Validation', () => {
    test('Works', async ({ page, transactions }) => {
      await page.goto(await consoleUrl())
      await transactions.navigate('validation')
      await transactions.run('validation/works')

      await page.fill('text=Name', 'John')
      await page.fill('text=Email', 'john@example.com')
      await page.fill('text=Age', '20')
      await transactions.continue()
      await transactions.expectValidationError(
        'Only Interval employees are invited to the holiday party.'
      )
      await page.fill('text=Email', 'john@interval.com')
      await page.click('text=Include drink tickets?')
      await transactions.continue()
      await transactions.expectGroupValidationError(
        'Attendees must be 21 years or older to receive drink tickets.'
      )
      await page.click('text=Include drink tickets?')
      await transactions.continue()
      await transactions.expectSuccess()
    })

    test('Optional', async ({ page, transactions }) => {
      await page.goto(await consoleUrl())
      await transactions.navigate('validation')
      await transactions.run('validation/optional')

      await transactions.continue()
      await transactions.continue()
      await transactions.expectSuccess()

      await transactions.restart()

      await page.fill('text=Name', 'John')
      await transactions.continue()

      // Don't enter anything
      await transactions.continue()
      await transactions.expectValidationError(
        'Must specify an age if name is specified.'
      )

      await page.fill('text=Age', '20')
      await transactions.continue()
      await transactions.expectSuccess({
        name: 'John',
        age: 20,
      })
    })
  })

  test.describe('Redirects', () => {
    test('URL', async ({ page, transactions }) => {
      await page.goto(await consoleUrl())
      await transactions.navigate('redirect')
      await transactions.run('redirect/redirect_url')

      const url = 'https://interval.com'

      await page.fill('text=Enter a URL', url)
      await transactions.continue()
      await page.waitForNavigation()
      expect(page.url()).toMatch(url)
    })

    test('Action', async ({ page, transactions }) => {
      await page.goto(await consoleUrl())
      await transactions.navigate('redirect')
      await transactions.run('redirect/redirect_action')

      const message = 'Hello, from a redirect!'

      await page.fill('text=Action slug', 'context')
      await page.fill('text=Params', JSON.stringify({ message }))
      await transactions.continue()
      await page.waitForNavigation()
      expect(page.url()).toMatch(/context/)
      await transactions.expectSuccess({ message })
    })
  })
})

test.describe.serial('Uploads', () => {
  test.skip(!process.env.TEST_UPLOADS)

  test('Upload file', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('upload')

    await transactions.continue()
    await transactions.expectValidationError()

    const [filechooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('text="Upload a file"'),
    ])

    const filePath = path.resolve('test/data/spreadsheet.csv')
    const fileName = path.basename(filePath)
    const buf = fs.readFileSync(filePath)

    await filechooser.setFiles(filePath)

    await expect(page.locator('text="File selected"')).toBeVisible()
    await transactions.continue()
    await transactions.expectSuccess({
      size: buf.byteLength,
      type: 'text/csv',
      name: fileName,
      extension: path.extname(fileName),
      text: fs.readFileSync(filePath, { encoding: 'utf-8' }),
    })
  })

  test('Custom upload endpoint', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('upload_custom_endpoint')

    await transactions.continue()
    await transactions.expectValidationError()

    const [filechooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('text="Upload a file"'),
    ])

    const filePath = path.resolve('test/data/spreadsheet.csv')
    const fileName = path.basename(filePath)
    const buf = fs.readFileSync(filePath)

    await filechooser.setFiles(filePath)

    await expect(page.locator('text="File selected"')).toBeVisible()
    await transactions.continue()
    await transactions.expectSuccess('/test-runner/')
    await transactions.expectSuccess({
      size: buf.byteLength,
      type: 'text/csv',
      name: fileName,
      extension: path.extname(fileName),
      text: fs.readFileSync(filePath, { encoding: 'utf-8' }),
    })
  })
})

test.describe('Dynamic add/remove', () => {
  test('before_listen', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('before_listen')
    await transactions.expectSuccess()
  })

  test('after_listen', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('before_listen')
    await transactions.expectSuccess()
  })

  test('self_destructing', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.navigate('dynamic_group')
    await transactions.run('dynamic_group/self_destructing')
    await transactions.expectSuccess()
    await page.waitForTimeout(200)
    await page.goto(await consoleUrl())
    await transactions.navigate('dynamic_group')
    await expect(
      page.locator(`[data-pw-run-slug='self_destructing']`)
    ).toBeHidden()
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

  test('Min/max', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('datetime')

    await expect(page.locator('.iv-datepicker')).toBeVisible()
    const dateInput = page.locator('.iv-datepicker input[type="text"]')
    await dateInput.fill('1/1/2000')

    const selects = page.locator('.iv-datepicker select')
    const [h, m, ampm] = [selects.nth(0), selects.nth(1), selects.nth(2)]
    await h.selectOption({ value: '6' })
    await m.type('0')
    await ampm.selectOption('am')

    const validationErrorMessage = `Please enter a date between ${dateTimeFormatter.format(
      new Date(2000, 0, 1, 7, 30)
    )} and ${dateTimeFormatter.format(new Date(2022, 11, 30, 13, 0))}.`
    await transactions.continue()
    await transactions.expectValidationError(validationErrorMessage)

    await dateInput.fill('12/30/2022')
    await h.selectOption({ value: '8' })
    await m.type('45')
    await ampm.selectOption('pm')

    await transactions.continue()
    await transactions.expectValidationError(validationErrorMessage)

    await ampm.selectOption('am')

    await transactions.continue()
    await transactions.expectSuccess()
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
