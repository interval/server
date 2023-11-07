import path from 'path'
import fs from 'fs'
import { Locator, expect } from '@playwright/test'
import { sleep, consoleUrl, config, isAppendUIEnabled } from '../../_setup'
import { test } from '../../_fixtures'
import {
  dateFormatter,
  timeFormatter,
  dateTimeFormatter,
} from '~/utils/formatters'
import { inputDate, inputTime } from '../../utils/date'
import { getActionUrl } from '~/utils/actions'
import * as db from '../../data/mockDb'

test.skip(!!process.env.SDK_VERSION && process.env.SDK_VERSION !== 'main')

test.describe.parallel('Basic transactions tests', () => {
  test('context', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('context')
    await page.goto(page.url() + '?message=Hello')
    await transactions.expectSuccess({
      user: 'Test Runner (test-runner@interval.com)',
      message: 'Hello',
      environment: 'development',
      role: 'admin',
      teams: '[]',
    })
  })

  test('io.display.heading', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('io.display.heading')
    await expect(page.locator('text=io.display.heading result')).toBeVisible()

    if (!isAppendUIEnabled) {
      await transactions.continue()
    }

    await expect(page.locator('text=Section heading')).toBeVisible()
    await expect(page.locator('text=Sub-heading')).toBeVisible()
    await expect(page.locator('text=Sub-heading')).toBeVisible()
    await expect(
      page.locator('a:has-text("External link item")')
    ).toHaveAttribute('href', 'https://interval.com')
    await expect(
      page.locator('a:has-text("Action link item")')
    ).toHaveAttribute(
      'href',
      getActionUrl({
        orgEnvSlug: 'test-runner',
        slug: 'context',
        mode: 'console',
        params: {
          param: true,
        },
      })
    )

    if (!isAppendUIEnabled) {
      await transactions.continue()
    }

    await transactions.expectSuccess()
  })

  test('io.group', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('io.group')
    await expect(page.locator('text=First item').nth(0)).toBeVisible()
    await expect(page.locator('text=Second item')).toBeVisible()

    if (!isAppendUIEnabled) {
      await transactions.continue()
    }

    const button = page.locator('button:has-text("Custom label")')
    await expect(button).toBeVisible()
    await expect(button).toHaveClass(/bg-red-500/)
    await transactions.continue()

    await page.fill('input[type="text"]', 'Hello')
    await page.fill('input[inputmode="numeric"]', '1337')
    await transactions.continue()

    await transactions.expectSuccess({
      text: 'Hello',
      num: 1337,
    })
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

  test('io.display.link', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('io.display.link')

    const actionUrl = getActionUrl({
      orgEnvSlug: 'test-runner',
      slug: 'helloCurrentUser',
      mode: 'console',
      absolute: false,
      params: {
        message: 'Hello from link!',
      },
    })

    await expect(page.locator('a:has-text("Link to action")')).toHaveAttribute(
      'href',
      actionUrl
    )
    await expect(page.locator('a:has-text("Link to route")')).toHaveAttribute(
      'href',
      actionUrl
    )
    await expect(
      page.locator('a:has-text("Link to external")')
    ).toHaveAttribute('href', 'https://interval.com')
  })

  test('io.display.metadata', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('io.display.metadata')

    const headings = ['Metadata list', 'Metadata grid', 'Metadata cards']
    for (let i = 0; i < headings.length; i++) {
      const n = isAppendUIEnabled ? i : 0
      const heading = headings[i]
      await expect(page.locator(`h4:has-text("${heading}")`)).toBeVisible()

      await expect(page.locator('dt:has-text("Is true")').nth(n)).toBeVisible()
      await expect(page.locator('dd:has-text("true")').nth(n)).toBeVisible()
      await expect(page.locator('dt:has-text("Is false")').nth(n)).toBeVisible()
      await expect(page.locator('dd:has-text("false")').nth(n)).toBeVisible()
      await expect(page.locator('dt:has-text("Is null")').nth(n)).toBeVisible()
      await expect(page.locator('dt:has-text("Is empty")').nth(n)).toBeVisible()
      await expect(
        page.locator('dt:has-text("Is long string")').nth(n)
      ).toBeVisible()
      await expect(
        page
          .locator(
            'dd:has-text("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed sit amet quam in lorem")'
          )
          .nth(n)
      ).toBeVisible()
      await expect(
        page.locator('dt:has-text("Is number 15")').nth(n)
      ).toBeVisible()
      await expect(page.locator('dd:has-text("15")').nth(n)).toBeVisible()
      await expect(
        page.locator('dt:has-text("Is string")').nth(n)
      ).toBeVisible()
      await expect(page.locator('dd:has-text("Hello")').nth(n)).toBeVisible()
      await expect(
        page.locator('dt:has-text("Action link")').nth(n)
      ).toBeVisible()
      await expect(
        page.locator('dd a:has-text("Click me")').nth(n)
      ).toBeVisible()

      await expect(
        page.locator('dt:has-text("Is a function")').nth(n)
      ).toBeVisible()
      await expect(
        page.locator('dd:has-text("Called it")').nth(n)
      ).toBeVisible()
      await expect(
        page.locator('dt:has-text("Is a promise")').nth(n)
      ).toBeVisible()
      await expect(page.locator('dd:has-text("Done!")').nth(n)).toBeVisible()
      await expect(
        page.locator('dt:has-text("Is an async function")').nth(n)
      ).toBeVisible()
      await expect(page.locator('dd:has-text("Did it")').nth(n)).toBeVisible()

      if (!isAppendUIEnabled) {
        await transactions.continue()
      }
    }

    await transactions.expectSuccess()
  })

  test('io.display.image', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('io.display.image')

    await expect(page.locator('text=Image via URL')).toBeVisible()
    let img = page.locator('img[data-pw-display-image]').first()
    await expect(img).toBeVisible()
    expect(img).toHaveAttribute(
      'src',
      'https://media.giphy.com/media/26ybw6AltpBRmyS76/giphy.gif'
    )
    expect(img).toHaveClass(/w-img-medium/)
    expect(await img.getAttribute('alt')).toBeTruthy()

    if (!isAppendUIEnabled) {
      await transactions.continue()
    }

    await expect(page.locator('text=Image via buffer')).toBeVisible()
    img = page
      .locator('img[data-pw-display-image]')
      .nth(isAppendUIEnabled ? 1 : 0)
    await expect(img).toBeVisible()
    expect(await img.getAttribute('src')).toMatch(/^data:/)
    expect(await img.getAttribute('alt')).toBeTruthy()

    if (!isAppendUIEnabled) {
      await transactions.continue()
    }

    await transactions.expectSuccess()
  })

  test('io.display.video', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('io.display.video')

    await expect(page.locator('text=Video via url')).toBeVisible()
    let video = page.locator('video[data-pw-display-video]').first()
    expect(video).toHaveAttribute(
      'src',
      'https://upload.wikimedia.org/wikipedia/commons/a/ad/The_Kid_scenes.ogv'
    )
    await expect(video).toBeVisible()

    if (!isAppendUIEnabled) {
      await transactions.continue()
    }

    await expect(page.locator('text=Video via buffer')).toBeVisible()
    video = page
      .locator('video[data-pw-display-video]')
      .nth(isAppendUIEnabled ? 1 : 0)
    await expect(video).toBeVisible()
    expect(await video.getAttribute('src')).toMatch(/^data:/)

    if (!isAppendUIEnabled) {
      await transactions.continue()
    }

    await transactions.expectSuccess()
  })

  test('io.display.grid', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('io.display.grid')

    await page
      .locator(
        '[role="grid-cell"]:nth-child(1) button:has-text("Open options")'
      )
      .click()

    expect(page.locator('text=Disabled item 0')).toBeDisabled()

    await expect(page.locator('text=External item 0')).toHaveAttribute(
      'href',
      'https://interval.com'
    )

    await page.locator('text=Action item 0').click()
    await expect(page.locator('text="Enter a URL"')).toBeVisible()
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

    if (!isAppendUIEnabled) {
      await transactions.continue()
    }

    await transactions.expectSuccess()
  })

  test('io.display.html', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('html')
    await expect(page.locator('text=Email body')).toBeVisible()

    await page.fill(
      'textarea',
      `
      <h1>Heading 1</h1>
      <p><em>Emphasis</em></p><p><u>Underline</u></p>
      <script>alert('hello, world!');</script>
      <noscript>No script.</noscript>
      <style>html { color: red; }</style>

      <form method="POST">
        <button onclick="window.alert">Form submit button</button>
      </form>

      <iframe src="https://interval.com"></iframe>

      <p class="text-xl" style="color: red;">Hello, in red!</p>
      <p class="text-lg">
      `
    )

    await transactions.continue()

    await expect(page.locator('text="You entered"')).toBeVisible()
    await expect(page.locator('.prose h1:has-text("Heading 1")')).toBeVisible()
    await expect(page.locator('.prose em:has-text("Emphasis")')).toBeVisible()
    await expect(page.locator('.prose u:has-text("Underline")')).toBeVisible()
    await expect(page.locator('text="No script."')).toBeHidden()
    await expect(page.locator('text="Form submit button"')).toBeHidden()
    await expect(
      page.locator('iframe[src="https://interval.com"]')
    ).toBeHidden()
    const p = page.locator('p:has-text("Hello, in red!")')
    expect(await p.getAttribute('style')).toBeFalsy()
    expect(await p.getAttribute('class')).toBeFalsy()

    if (!isAppendUIEnabled) {
      await transactions.continue()
    }

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

  test('io.input.boolean', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('io.input.boolean')
    await expect(page.locator('text=Is optional')).toBeVisible()

    // do not expect validation error since checkbox can be true/false
    await transactions.continue()

    // default state is unchecked
    await page.locator('label:has-text("Is true")').click()
    await transactions.continue()

    // default state is checked
    await page
      .locator('label:has-text("Is false") input[type="checkbox"]')
      .click()
    await transactions.continue()

    await transactions.expectSuccess({
      isTrue: 'true',
      isFalse: 'false',
      isOptional: 'false',
    })
  })

  test.describe('io.input.number', () => {
    test('Basic', async ({ page, transactions }) => {
      await page.goto(await consoleUrl())
      await transactions.run('io.input.number')

      await transactions.expectValidationErrorFromSubmit()

      await page.click('text=Enter a number')
      await page.locator('input[inputmode="numeric"]').last().fill('12')
      await transactions.continue()

      await page.click('text=Enter a second number')
      await page.locator('input[inputmode="numeric"]').last().fill('7')
      await transactions.continue()
      await transactions.expectValidationError(
        'Please enter a number greater than or equal to 13.'
      )

      await page.locator('input[inputmode="numeric"]').last().fill('13')
      await transactions.continue()
      await transactions.expectSuccess()
    })

    test('Negative numbers', async ({ page, transactions }) => {
      await page.goto(await consoleUrl())
      await transactions.run('io.input.number')

      await transactions.expectValidationErrorFromSubmit()

      await page.click('text=Enter a number')
      await page.locator('input[inputmode="numeric"]').last().fill('-12')
      await transactions.continue()

      await page.click('text=Enter a second number')
      await page.locator('input[inputmode="numeric"]').last().fill('-15')
      await transactions.continue()
      await transactions.expectValidationError(
        'Please enter a number greater than or equal to -11.'
      )

      await page.locator('input[inputmode="numeric"]').last().fill('12')
      await transactions.continue()
      await transactions.expectSuccess({
        num1: -12,
        num2: 12,
        sum: 0,
      })
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

  test.describe('io.input.slider', () => {
    test('Slider entry', async ({ page, transactions }) => {
      await page.goto(await consoleUrl())
      await transactions.run('io.input.slider')

      await transactions.expectValidationErrorFromSubmit()

      await expect(page.locator('text=Enter a number')).toBeVisible()
      await page.locator('input[type="range"]').last().fill('12')
      await transactions.continue()

      await expect(page.locator('text=Select a decimal value')).toBeVisible()
      await page.locator('input[type="range"]').last().fill('12.5')
      await transactions.continue()
      await transactions.expectSuccess()
    })

    test('Keyboard entry', async ({ page, transactions }) => {
      function lastRange() {
        return page.locator('input[type="range"]').last()
      }

      await page.goto(await consoleUrl())
      await transactions.run('io.input.slider')

      await transactions.expectValidationErrorFromSubmit()

      // each keystroke should be treated as a separate input, the threshold is 1.5s
      await lastRange().focus()
      await lastRange().type('79', { delay: 2000 }) // intentional delay to test functionality
      expect(await lastRange().inputValue()).toBe('9')

      await transactions.continue()

      // this should be treated as a single input, "15"
      await lastRange().focus()
      await lastRange().type('15', { delay: 1000 }) // intentional delay to test functionality
      await transactions.continue()
      await transactions.expectValidationError(
        'Please enter a number between 9 and 10.'
      )

      await lastRange().focus()
      await lastRange().type('9.5')
      await transactions.continue()
      await transactions.expectSuccess()
    })

    test('Input entry', async ({ page, transactions }) => {
      function checkSelection(selector: string, range: [number, number]) {
        return page.waitForFunction(
          ({ selector, range }) => {
            const inputs = document.querySelectorAll(selector)
            const input = inputs[inputs.length - 1] as HTMLInputElement
            return (
              input.selectionStart === range[0] &&
              input.selectionEnd === range[1]
            )
          },
          { selector, range },
          { timeout: 1000 }
        )
      }

      let inputSelector: string

      await page.goto(await consoleUrl())
      await transactions.run('io.input.slider')

      await transactions.expectValidationErrorFromSubmit()

      inputSelector = 'input[inputmode="numeric"]'

      await page.click('text=Enter a number between 1-100')
      await checkSelection(inputSelector, [0, 1]) // expects "1"
      await page.locator(inputSelector).last().fill('12')
      await transactions.continue()

      inputSelector = 'input[inputmode="decimal"]'

      await page.click('text=Select a decimal value')
      await checkSelection(inputSelector, [0, 2]) // expects "12"
      await page.locator(inputSelector).last().fill('15.5')
      await transactions.continue()
      await transactions.expectValidationError(
        'Please enter a number between 12 and 13.'
      )

      await page.click('text=Select a decimal value')
      await checkSelection(inputSelector, [0, 4]) // expects "15.5"
      await page.locator(inputSelector).last().fill('12.5')
      await transactions.continue()
      await transactions.expectSuccess()
    })
  })

  test('io.confirm', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('confirm')

    await expect(page.locator('text=Are you sure?')).toBeVisible()
    await expect(page.locator('text=Really sure?')).toBeVisible()
    await page.locator('button:has-text("Confirm")').click()

    await expect(page.locator('text=Still?')).toBeVisible()
    await page.locator('[data-io-confirm] button:has-text("Cancel")').click()

    await transactions.expectSuccess({
      first: true,
      second: false,
    })
  })

  test('io.confirmIdentity', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.run('confirmIdentity')

    await expect(
      page.locator('text=Please confirm your identity to continue')
    ).toBeVisible()
    await expect(page.locator('text=First')).toBeVisible()
    await page.fill('input[type="password"]', config.login.password)
    await page.locator('button:has-text("Verify")').click()
    await expect(page.locator('text=Second')).toBeHidden()
    await expect(page.locator('text=Third')).toBeVisible()
    await page.locator('[data-iv-dialog] button:has-text("Cancel")').click()

    await transactions.expectSuccess({
      first: true,
      second: true,
      third: false,
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

    await expect(page.locator('text=secure URL')).toBeVisible()

    const secureInput = page.locator('input[type="text"]').last()
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
      page.locator('text=Optionally modify the selection').last()
    ).toBeVisible()
    await expect(
      page.locator(`input[type="checkbox"][value="${date}"]`).last()
    ).toBeChecked()
    await expect(
      page.locator('input[type="checkbox"][value="true"]').last()
    ).toBeChecked()
    await expect(
      page.locator('input[type="checkbox"][value="3"]').last()
    ).toBeChecked()

    await transactions.continue()
    await transactions.expectValidationError(
      'Please make no more than 2 selections.'
    )

    await page.locator(`input[type="checkbox"][value="${date}"]`).last().click()
    await page.locator('input[type="checkbox"][value="true"]').last().click()
    await page.locator('input[type="checkbox"][value="3"]').last().click()
    await transactions.continue()
    await transactions.expectValidationError(
      'Please make at least 1 selection.'
    )

    await page.locator(`input[type="checkbox"][value="${date}"]`).last().click()
    await page.locator('input[type="checkbox"][value="3"]').last().click()
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

    await page.locator('[role="cell"]:has-text("Dan")').click()
    await page.locator('[role="cell"]:has-text("Ryan")').click()
    await transactions.continue()

    expect(await page.locator('pre code').textContent()).toBe(
      `[{"firstName":"Jacob","lastName":"Mischka","favoriteColor":"Orange"}]\n`
    )

    if (!isAppendUIEnabled) {
      await transactions.continue()
    }

    await page.locator('[role="cell"]:has-text("Jacob")').last().click()
    await page.locator('[role="cell"]:has-text("Alex")').last().click()
    await page.locator('[role="cell"]:has-text("Dan")').last().click()
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
    await page
      .locator('.iv-select__menu div div:has-text("Admin")')
      .last()
      .click()
    expect(
      await page.locator('.iv-select__single-value').last().textContent()
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

  test.describe('Search', () => {
    test('One search', async ({ page, transactions }) => {
      await page.goto(await consoleUrl())
      await transactions.run('search')

      const label = page.locator('label:has-text("Find something")')
      await expect(label).toBeVisible()

      await transactions.continue()
      await transactions.expectValidationError()

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

    test('Multi-search', async ({ page, transactions }) => {
      await page.goto(await consoleUrl())
      await transactions.run('multi_search')

      const label = page.locator('label:has-text("Find some users")')
      await expect(label).toBeVisible()

      await transactions.continue()
      await transactions.expectValidationError()

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
          page.locator(`.iv-select__multi-value__label:has-text("${query}")`)
        ).toBeVisible()
        await expect(
          page.locator(
            `[data-pw-search-result]:has-text("${query}"):nth-child(1)`
          )
        ).toBeHidden()
      }

      await searchAndSelect('Jacob')
      await searchAndSelect('Ryan')

      await transactions.continue()
      await transactions.expectSuccess({
        0: 'Joesph Jacobi (Gina_Hilll@gmail.com)',
        1: 'Ryann Will (Eleanore70@yahoo.com)',
      })
    })

    test('Optional multi-search', async ({ page, transactions }) => {
      await page.goto(await consoleUrl())
      await transactions.run('optional_multi_search')

      const label = page.locator('label:has-text("Find some users")')
      await expect(label).toBeVisible()

      await transactions.continue()
      await transactions.expectSuccess()

      await transactions.restart()
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
          page.locator(`.iv-select__multi-value__label:has-text("${query}")`)
        ).toBeVisible()
        await expect(
          page.locator(
            `[data-pw-search-result]:has-text("${query}"):nth-child(1)`
          )
        ).toBeHidden()
      }

      await searchAndSelect('Jacob')
      await searchAndSelect('Ryan')

      await transactions.continue()
      await transactions.expectSuccess({
        0: 'Joesph Jacobi (Gina_Hilll@gmail.com)',
        1: 'Ryann Will (Eleanore70@yahoo.com)',
      })
    })

    test('Two searches', async ({ page, transactions }) => {
      await page.goto(await consoleUrl())
      await transactions.run('two_searches')

      const label1 = page.locator('label:has-text("First")')
      const label2 = page.locator('label:has-text("Second")')

      const inputId1 = await label1.getAttribute('for')
      const inputId2 = await label2.getAttribute('for')
      const input1 = page.locator(`#${inputId1}`)
      const input2 = page.locator(`#${inputId2}`)
      await input1.click()
      await input1.fill('view')
      await expect(
        page.locator('[data-pw-search-result]:has-text("Viewer"):nth-child(1)')
      ).toBeVisible()
      await page.keyboard.press('ArrowDown')
      await input1.press('Enter')
      await expect(
        page.locator('[data-pw-selected-search-result]:has-text("Viewer")')
      ).toBeVisible()

      await input2.click()
      for (let i = 0; i < 3; i++) {
        await input2.fill('abc')
        await expect(page.locator('text="Loading..."')).toBeVisible()
        await expect(page.locator('text="No results found."')).toBeVisible()
        await input2.fill('fdsa')
        await expect(page.locator('text="Loading..."')).toBeVisible()
        await expect(page.locator('text="No results found."')).toBeVisible()
      }

      await input2.fill('viewer')
      await expect(
        page.locator('[data-pw-search-result]:has-text("Viewer"):nth-child(1)')
      ).toBeVisible()
      await page.keyboard.press('ArrowDown')
      await expect(
        page.locator('[data-pw-search-result]:has-text("Viewer"):nth-child(1)')
      ).toHaveAttribute('data-pw-search-result-focused', 'true')
      await input2.press('Enter')

      await transactions.continue()
      await transactions.expectSuccess({
        r1: 'Viewer',
        r2: 'Viewer',
        equal: true,
        equalIndex: true,
      })
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
      'Select single',
      'Select multiple',
      'Search',
    ]

    for (const field of fields) {
      switch (field) {
        case 'Rich text':
          await page.locator(`div.ProseMirror`).last().click()
          break
        case 'Select single':
        case 'Search':
          await page.locator(`label:has-text("${field}")`).last().click()
          break
        default:
          await page.locator(`text=${field}`).last().click()
          break
      }
      await page.locator(':focus').evaluate(e => e.blur())
      await expect(page.locator('[data-pw="input-error"]')).toBeHidden()
      await transactions.continue()
    }

    await expect(page.locator('text="Date"').last()).toBeVisible()
    await inputDate(
      page.locator('.iv-timepicker').nth(isAppendUIEnabled ? 3 : 0)
    )
    await transactions.continue()
    await expect(page.locator('text="Datetime"').last()).toBeVisible()
    await inputDate(
      page.locator('.iv-timepicker').nth(isAppendUIEnabled ? 4 : 0)
    )
    await inputTime(
      page.locator('.iv-timepicker').nth(isAppendUIEnabled ? 4 : 0)
    )
    await transactions.continue()
    await page.locator('[role="cell"]:has-text("5")').last().click()
    await transactions.continue()

    await expect(page.locator('text="Date"').last()).toBeVisible()
    await expect(page.locator('text=jsDate').last()).toBeVisible()

    if (!isAppendUIEnabled) {
      await transactions.continue()
    }

    await expect(page.locator('text="Datetime"').last()).toBeVisible()
    await expect(page.locator('text=jsDate').last()).toBeVisible()

    if (!isAppendUIEnabled) {
      await transactions.continue()
    }

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
      page.locator('text=Are you ready to do something else?')
    ).toBeVisible()

    await page.waitForTimeout(1000)

    await expect(
      page.locator('text=Are you ready to do something else?')
    ).toBeVisible()

    await page.locator('button:has-text("Confirm")').click()

    await expect(
      page.locator('[data-pw-label]:has-text("With progress")')
    ).toBeVisible()

    for (let i = 0; i <= 5; i++) {
      await expect(page.locator(`text=Completed ${i} of 5`)).toBeVisible()
    }

    await transactions.expectSuccess()
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

    await page.locator('button:has-text("Confirm")').click()

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

    if (!isAppendUIEnabled) {
      await transactions.continue()
    }

    await transactions.expectResult('5n')
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

    test('Works with objects', async ({ page, transactions }) => {
      await page.goto(await consoleUrl())
      await transactions.navigate('validation')
      await transactions.run('validation/object_works')

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
        'Object-based attendees must be 21 years or older to receive drink tickets.'
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

    test('Multiple', async ({ page, transactions }) => {
      await page.goto(await consoleUrl())
      await transactions.navigate('validation')
      await transactions.run('validation/multiple')

      const firstUser = db.getUsers()[0]

      const label = page.locator('label:has-text("Select a user")')
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
          page.locator(`.iv-select__multi-value__label:has-text("${query}")`)
        ).toBeVisible()
        await expect(
          page.locator(
            `[data-pw-search-result]:has-text("${query}"):nth-child(1)`
          )
        ).toBeHidden()
      }

      await searchAndSelect(firstUser.email)
      await searchAndSelect('Alex')
      await searchAndSelect('Dan')

      await transactions.continue()
      await transactions.expectValidationError(
        `${firstUser.firstName} is not allowed.`
      )

      await page.click(
        `[aria-label="Remove ${firstUser.firstName} ${firstUser.lastName} (${firstUser.email})"]`
      )

      await transactions.continue()
      await transactions.expectSuccess()
    })

    test('Checkboxes', async ({ page, transactions }) => {
      await page.goto(await consoleUrl())
      await transactions.navigate('validation')
      await transactions.run('validation/checkboxes')

      await transactions.continue()
      await transactions.expectSuccess()

      await transactions.restart()

      await expect(page.locator('text=Select anything but B')).toBeVisible()

      await page.click('input[type="checkbox"][value="A"]')
      await page.click('input[type="checkbox"][value="B"]')
      await page.click('input[type="checkbox"][value="C"]')

      await transactions.continue()
      await transactions.expectValidationError('Anything but B.')
      await page.click('input[type="checkbox"][value="B"]')

      await transactions.continue()
      await transactions.expectSuccess({
        A: true,
        B: false,
        C: true,
        D: false,
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

    test('Replace', async ({ page, transactions }) => {
      await page.goto(await consoleUrl())
      await transactions.navigate('redirect')
      await transactions.run('redirect/redirect_replace')

      await page.waitForNavigation()
      expect(page.url()).toMatch(/context/)
      await transactions.expectSuccess({ message: 'Press back, I dare you' })
      await page.click('.btn a:has-text("Go back")')
      expect(page.url()).toMatch(/actions\/redirect$/)
    })

    test('From a page', async ({ page, transactions }) => {
      await page.goto(await consoleUrl())
      await transactions.navigate('redirect')
      await transactions.navigate('redirect/redirect_page')

      await page.waitForNavigation()
      expect(page.url()).toMatch(/context/)
      await transactions.expectSuccess({ message: 'From a page!' })
      await page.goBack()
      expect(page.url()).toMatch(/actions\/redirect$/)
    })
  })

  test.describe('Unlisted', () => {
    test('Action', async ({ page, transactions }) => {
      await page.goto(await consoleUrl())
      await expect(page.locator('[data-pw-actions-list]')).toBeVisible()
      await expect(
        page.locator('[data-pw-run-slug="unlisted_action"]')
      ).toBeHidden()
      await page.goto(`${await consoleUrl()}/unlisted_action`)
      await transactions.expectSuccess()
    })

    test('Group', async ({ page, transactions }) => {
      await page.goto(await consoleUrl())
      await expect(page.locator('[data-pw-actions-list]')).toBeVisible()
      await expect(
        page.locator('[data-pw-action-group="unlisted_group"]')
      ).toBeHidden()
      await page.goto(`${await consoleUrl()}/unlisted_page`)
      await expect(page.locator('h2:has-text("Unlisted page")')).toBeVisible()
      await page.goto(`${await consoleUrl()}/unlisted_page/unlisted_listed`)
      await transactions.expectSuccess()
    })

    test('Navigation', async ({ page }) => {
      await page.goto(`${await consoleUrl()}/unlisted_page`)
      await expect(page.locator('h2:has-text("Unlisted page")')).toBeVisible()
      await expect(page.locator('a:has-text("unlisted_listed")')).toHaveCount(2)
      await expect(page.locator('a:has-text("Listed subpage")')).toHaveCount(2)
      await expect(
        page.locator('a', { hasText: /^Listed subpage/ })
      ).toHaveCount(2)
      await expect(page.locator('a:has-text("Unlisted subpage")')).toHaveCount(
        0
      )
    })
  })
})

test.describe('Pages', () => {
  test('Works', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.navigate('users')

    await expect(page.locator('h2:text("Users")')).toBeVisible()
    await expect(page.locator('.iv-table')).toBeVisible()
    await expect(page.locator('text=of 313').nth(0)).toBeVisible()
  })

  test('Metadata works', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.navigate('users')

    await expect(page.locator('dt:text("Total users")')).toBeVisible()
    await expect(page.locator('dd :text-is("313")')).toBeVisible()
    await expect(page.locator('dt:text("New today")')).toBeVisible()
    await expect(page.locator('dd :text-is("6")')).toBeVisible()
    await expect(page.locator('dt:text("New this week")')).toBeVisible()
    await expect(page.locator('dd :text-is("61")')).toBeVisible()
  })

  test('Sub-action works', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.navigate('users')
    await transactions.run('users/view_funnel')

    await expect(page.locator('h2:text("View funnel")')).toBeVisible()
    await expect(page.locator('text=🌪️')).toBeVisible()
  })
})

test.describe.serial('Uploads', () => {
  test.skip(!process.env.TEST_UPLOADS)

  test('Upload file', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.navigate('uploads')
    await transactions.run('uploads/upload')

    await transactions.continue()
    await transactions.expectSuccess()

    await transactions.restart()
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
    await transactions.navigate('uploads')
    await transactions.run('uploads/upload_custom_endpoint')

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

  test('Multi-upload', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.navigate('uploads')
    await transactions.run('uploads/multiple')

    await transactions.continue()
    await transactions.expectValidationError()

    const [filechooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('text="Upload some files"'),
    ])

    const inputFiles = ['test/data/spreadsheet.csv', 'test/data/fail.gif'].map(
      relativePath => {
        const filePath = path.resolve(relativePath)
        const fileName = path.basename(filePath)
        const buf = fs.readFileSync(filePath)

        return {
          filePath,
          fileName,
          buf,
        }
      }
    )

    await filechooser.setFiles(inputFiles.map(({ filePath }) => filePath))

    await expect(page.locator('text="2 files selected"')).toBeVisible()
    await transactions.continue()
    await transactions.expectSuccess(
      Object.fromEntries(
        inputFiles.map(({ fileName, buf }) => [fileName, buf.byteLength])
      )
    )
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
      page.locator(`[data-pw-run-slug='dyanamic_group/self_destructing']`)
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

test.describe('With choices', async () => {
  test('On display', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.navigate('with_choices')
    await transactions.run('with_choices/on_display')

    await expect(page.locator('text=Press OK')).toBeVisible()
    await transactions.continue('OK')
    await transactions.expectSuccess({
      choice: 'OK',
    })
  })

  test('On input', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.navigate('with_choices')
    await transactions.run('with_choices/on_input')

    await expect(page.locator('text=Enter a number')).toBeVisible()
    await page.fill('input', '24')
    await transactions.continue('Make it negative')
    await transactions.expectSuccess({
      choice: 'negative',
      returnValue: -24,
    })

    await transactions.restart()

    await expect(page.locator('text=Enter a number')).toBeVisible()
    await page.fill('input', '-19')
    await transactions.continue('Do nothing')
    await transactions.expectSuccess({
      choice: 'Do nothing',
      returnValue: -19,
    })

    await transactions.restart()

    await expect(page.locator('text=Enter a number')).toBeVisible()
    await transactions.continue('Do nothing')
    await transactions.expectSuccess({
      choice: 'Do nothing',
      returnValue: 'Nothing',
    })
  })

  test('With multiple', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.navigate('with_choices')
    await transactions.run('with_choices/with_multiple')

    const label = page.locator('label:has-text("Select some users")')
    await expect(label).toBeVisible()

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
        page.locator(`.iv-select__multi-value__label:has-text("${query}")`)
      ).toBeVisible()
      await expect(
        page.locator(
          `[data-pw-search-result]:has-text("${query}"):nth-child(1)`
        )
      ).toBeHidden()
    }

    await searchAndSelect('Jacob')
    await searchAndSelect('Ryan')

    await transactions.continue('Delete them')
    await transactions.expectSuccess({
      choice: 'delete',
      returnValue:
        'Joesph Jacobi (Gina_Hilll@gmail.com), Ryann Will (Eleanore70@yahoo.com)',
    })
  })

  test('On group', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.navigate('with_choices')
    await transactions.run('with_choices/on_group')

    await expect(page.locator('text=Important data')).toBeVisible()
    await page.fill('input', 'Student loans')
    await transactions.continue('Delete the data')
    await transactions.expectSuccess({
      choice: 'delete',
      returnValue: 'Student loans',
    })

    await transactions.restart()

    await expect(page.locator('text=Important data')).toBeVisible()
    await page.fill('input', 'Taco Bell Quesarito')
    await transactions.continue('Cancel')
    await transactions.expectSuccess({
      choice: 'cancel',
      returnValue: 'Taco Bell Quesarito',
    })
  })

  test('On keyed group', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.navigate('with_choices')
    await transactions.run('with_choices/on_group_keyed')

    await expect(page.locator('text=Important data')).toBeVisible()
    await page.fill('input', 'Student loans')
    await transactions.continue('Delete the data')
    await transactions.expectSuccess({
      choice: 'delete',
      returnValue: 'Student loans',
    })

    await transactions.restart()

    await expect(page.locator('text=Important data')).toBeVisible()
    await page.fill('input', 'Taco Bell Quesarito')
    await transactions.continue('Cancel')
    await transactions.expectSuccess({
      choice: 'cancel',
      returnValue: 'Taco Bell Quesarito',
    })
  })

  test('With group validation', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.navigate('with_choices')
    await transactions.run('with_choices/with_group_validation')

    await expect(page.locator('text=Enter')).toBeVisible()
    await page.fill('input', 'No')
    await transactions.continue('Continue if OK')
    await transactions.expectValidationError('Should be OK.')
    await page.fill('input', 'OK')
    await transactions.continue('Continue if OK')

    await transactions.expectSuccess({
      choice: 'Continue if OK',
      returnValue: 'OK',
    })
  })

  test('With validation', async ({ page, transactions }) => {
    await page.goto(await consoleUrl())
    await transactions.navigate('with_choices')
    await transactions.run('with_choices/with_validation')

    await expect(page.locator('text=Enter')).toBeVisible()
    await page.fill('input', 'No')
    await transactions.continue('Continue if OK')
    await transactions.expectValidationError('Should be OK.')
    await page.fill('input', 'OK')
    await transactions.continue('Continue if OK')

    await transactions.expectSuccess({
      choice: 'Continue if OK',
      returnValue: 'OK',
    })
  })
})
