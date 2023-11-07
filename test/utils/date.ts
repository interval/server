import { sleep } from './../_setup'
import { expect, Page, Locator } from '@playwright/test'
import { Transaction } from '../classes/Transaction'

export async function inputDate(picker: Locator | Page) {
  const input = picker.locator('.iv-datepicker input[type="text"]')
  await input.click()
  await sleep(200) // wait for 100ms delay we apply before showing the popover
  await input.fill('02/22/2022')
  await picker.locator('.flatpickr-day:has-text("25")').click()
  expect(await input.inputValue()).toBe('02/25/2022')
}

export async function inputInvalidDate(
  picker: Locator | Page,
  transactions: Transaction
) {
  const input = picker.locator('.iv-datepicker input[type="text"]')
  await input.click()
  await sleep(200) // wait for 100ms delay we apply before showing the popover
  await input.fill('12/34/5678')
  await input.press('Tab')
  await transactions.continue()
  await transactions.expectValidationError('Please enter a valid date.')
}

export async function inputTime(picker: Locator | Page) {
  await expect(picker.locator('.iv-datepicker')).toBeVisible()
  const selects = picker.locator('.iv-datepicker select')

  const [h, m, ampm] = [selects.nth(0), selects.nth(1), selects.nth(2)]

  await h.selectOption({ value: '2' })
  await h.press('Tab')

  await expect(m).toBeFocused()
  await m.type('36')
  await m.press('Tab')

  await expect(ampm).toBeFocused()
  await ampm.selectOption('pm')
  // Note: keyboard navigation does not seem to work here.
  // ampm.press('ArrowDown') or page.keyboard.press('ArrowDown') doesn't move the selection to 'PM'.
}
