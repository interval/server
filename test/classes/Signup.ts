import { Page } from '@playwright/test'
import { getConfirmUrl } from '~/server/auth'
import prisma from '../../src/server/prisma'

export function generateTestEmail() {
  return `accounts+${new Date().getTime()}@interval.dev`
}

export class Signup {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async fillSignupForm(customArgs?: {
    firstName?: string
    lastName?: string
    email?: string | null
    password?: string
    promoCode?: string
    organizationName?: string | null
  }) {
    const email = customArgs?.email ?? generateTestEmail()

    if (customArgs?.email !== null) {
      await this.page.fill('input[name="email"]', email)
      await this.page.click('button[type="submit"]')
    }

    const defaults = {
      firstName: 'Test',
      lastName: 'User',
      password: 'password',
      organizationName: 'Test Org',
    }

    for (const key in defaults) {
      if (customArgs?.[key] === null) {
        continue
      }

      const val =
        customArgs && key in customArgs ? customArgs[key] : defaults[key]
      await this.page.fill(`input[name="${key}"]`, val)
    }

    if (customArgs?.promoCode) {
      await this.page.locator('text=Have a promo code?').click()
      await this.page.fill(
        'input[name="organizationPromoCode"]',
        customArgs.promoCode
      )
    }

    return { email }
  }

  async getConfirmEmailUrl(email: string) {
    const token = await prisma.userEmailConfirmToken.findFirst({
      where: {
        user: { email },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!token) throw new Error('Unable to get signup URL')

    return { id: token.id, url: await getConfirmUrl(token.id) }
  }

  async expireEmailConfirmation(id: string) {
    await prisma.userEmailConfirmToken.update({
      where: { id },
      data: {
        expiresAt: new Date(0),
      },
    })
  }
}
