import { Page, expect } from '@playwright/test'
import type { ParsedActionReturnData } from '@interval/sdk/dist/ioSchema'
import { dateTimeFormatter } from '../../src/utils/formatters'
import { dashboardUrl } from '../../test/_setup'

export class Transaction {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async navigate(groupSlug: string) {
    await this.page.click(`[data-pw-action-group="${groupSlug}"]`)
  }

  async run(slug: string) {
    console.log('Starting test', slug)
    await this.page.locator(`[data-pw-run-slug='${slug}']`).click()
  }

  async visit(slug: string, orgSlug?: string) {
    await this.page.goto(await dashboardUrl(`/actions/${slug}`, orgSlug))
  }

  async continue(label?: string) {
    await this.page
      .locator(
        `button[data-pw="continue-button"]${
          label ? `:has-text("${label}")` : ''
        }`
      )
      .click({
        // Avoids issues with the button being partially obstructed by popovers.
        // 0,0 seems to cause issues with clicking the button (border, maybe?), so we increase it a little.
        position: { x: 3, y: 3 },
      })
  }

  async restart() {
    await this.page.locator('button:has-text("New transaction")').click()
    await this.page.waitForLoadState('networkidle')
    await expect(
      this.page.locator('button[data-pw="continue-button"]').nth(0)
    ).toBeVisible()
  }

  async expectValidationError(message?: string) {
    await expect(
      this.page.locator(
        `[data-pw="field-error"]:has-text("${
          message ?? 'This field is required.'
        }")`
      )
    ).toBeVisible()
  }

  async expectNoValidationError(message?: string) {
    await expect(
      this.page.locator(
        `[data-pw="field-error"]:has-text("${
          message ?? 'This field is required.'
        }")`
      )
    ).toBeHidden()
  }

  async expectGroupValidationError(message: string) {
    await expect(
      this.page.locator(`[data-pw="form-error"]:has-text("${message}")`)
    ).toBeVisible()
  }

  async expectValidationErrorFromSubmit(message?: string) {
    await this.continue()
    await this.expectValidationError(message)
    await this.restart()
  }

  async expectSuccess(result?: ParsedActionReturnData) {
    await expect(
      this.page.locator('[data-test-id="result-type"]:has-text("Completed")')
    ).toBeVisible()
    if (result) await this.expectResult(result)
  }

  async expectNotFound() {
    await expect(this.page.locator('text=Not found')).toBeVisible()
  }

  async expectFailure(result?: { message: string; error?: string }) {
    await expect(
      this.page.locator('[data-test-id="result-type"]:has-text("Error")')
    ).toBeVisible()

    if (result) {
      await expect(
        this.page.locator('[data-test-id="transaction-result"]')
      ).toContainText(result.message)

      if (result.error) {
        await expect(
          this.page.locator('[data-test-id="transaction-result"]')
        ).toContainText(result.error)
      }
    }
  }

  async expectResult(result: ParsedActionReturnData | string) {
    // note: the results are shown in a table, and el.innerText joins table column values together, though order is not guaranteed to be consistent.

    if (result == null) return

    if (typeof result === 'object') {
      if (Array.isArray(result)) {
        await Promise.all(
          result.map(async (val, i) => {
            if (typeof val === 'number') {
              val = val.toLocaleString()
            } else if (val instanceof Date) {
              val = dateTimeFormatter.format(val)
            }
            await expect(
              this.page.locator('[data-test-id="transaction-result"]')
            ).toContainText(`${i}${val}`)
          })
        )
      } else {
        for (let [key, val] of Object.entries(result)) {
          if (typeof val === 'number') {
            val = val.toLocaleString()
          }

          await expect(
            this.page.locator('[data-test-id="transaction-result"]')
          ).toContainText(`${key}${val}`)
        }
      }
    } else {
      await expect(
        this.page.locator('[data-test-id="transaction-result"]')
      ).toContainText(result.toString())
    }
  }
}
