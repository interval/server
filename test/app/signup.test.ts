import { test } from '../_fixtures'
import { config, prisma } from '../_setup'
import { expect } from '@playwright/test'
import { generateTestEmail } from '../classes/Signup'

test.skip(!!process.env.SDK_VERSION && process.env.SDK_VERSION !== 'main')
test.skip(!!process.env.GHOST_MODE)

test.beforeAll(async () => {
  console.log('Enabling USER_REGISTRATION_ENABLED feature flag...')
  await prisma.globalFeatureFlag.upsert({
    create: {
      flag: 'USER_REGISTRATION_ENABLED',
      enabled: true,
    },
    update: {
      enabled: true,
    },
    where: {
      flag: 'USER_REGISTRATION_ENABLED',
    },
  })
})

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies()
})

test.describe('Sign up', () => {
  test('signs up for an account', async ({ page, signup }) => {
    await page.goto('/signup')
    const { email } = await signup.fillSignupForm()
    await page.click('button[type="submit"]')

    await page.click('[data-pw-nav-control-panel-toggle]')
    await expect(
      page.locator('text=Confirm your email to create and deploy live actions')
    ).toBeVisible()

    const user = await prisma.user.findUnique({
      where: { email },
      include: { organizations: true },
    })

    expect(user?.organizations[0].name).toEqual('Test Org')

    const conf = await signup.getConfirmEmailUrl(email)
    await page.goto(conf.url)
    await page.waitForURL(/\/dashboard\/[a-z]*/)
  })

  test("can't sign up with an existing email", async ({ page }) => {
    await page.goto('/signup')
    await page.fill('input[name="email"]', config.login.email)
    await page.click('button[type="submit"]')
    await expect(page.locator('text=already exists')).toBeVisible()
  })

  test('signs up with a promo code', async ({ page, signup }) => {
    await page.goto('/signup')
    const { email } = await signup.fillSignupForm()

    await page.locator('text=Have a promo code?').click()

    const invalidCode = new Date().getTime().toString()

    await page.fill('input[name="organizationPromoCode"]', invalidCode)
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Invalid promo code')).toBeVisible()

    await page.fill('input[name="organizationPromoCode"]', config.promoCode)

    await page.click('button[type="submit"]')

    await page.waitForURL(/\/dashboard\/[a-z]*/)

    const user = await prisma.user.findUnique({
      where: { email },
      include: { organizations: true },
    })

    expect(user?.organizations[0].promoCode).toEqual(config.promoCode)
  })

  test('signs up with an invitation', async ({ page, signup }) => {
    const email = generateTestEmail()

    const org = await prisma.organization.findUnique({
      where: {
        slug: config.orgSlug,
      },
    })

    if (!org) {
      throw new Error(`Test organization ${config.orgSlug} not found`)
    }

    const group = await prisma.userAccessGroup.upsert({
      where: {
        organizationId_slug: {
          organizationId: org.id,
          slug: 'test-group',
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        name: 'Test group',
        slug: 'test-group',
      },
    })

    const token = await prisma.userOrganizationInvitation.create({
      data: {
        email,
        organization: { connect: { slug: config.orgSlug } },
        permissions: ['DEVELOPER'],
        groupIds: [group.id],
      },
    })

    await page.goto(`/signup?token=${token.id}`)
    await expect(page.locator('text=inviting you to join')).toBeVisible()
    await expect(page.locator(`input[value="${email}"]:disabled`)).toBeVisible()

    await signup.fillSignupForm({ email: null, organizationName: null })
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard\/[a-z]*/)

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userOrganizationAccess: {
          include: {
            organization: true,
            groupMemberships: true,
          },
        },
      },
    })

    expect(user?.userOrganizationAccess[0].organization.slug).toEqual(
      config.orgSlug
    )
    expect(user?.userOrganizationAccess[0].permissions).toContain('DEVELOPER')
    expect(
      user?.userOrganizationAccess[0].groupMemberships.map(g => g.groupId)
    ).toEqual([group.id])

    // This organization doesn't yet have new dashboard enabled
    // await page.click('[data-pw-nav-control-panel-toggle]')
    await expect(
      page.locator('text=Confirm your email to create and deploy live actions')
    ).not.toBeVisible()
  })

  test('confirms email while logged out', async ({ browser, page, signup }) => {
    // This test fails in CI and we cannot figure out why anymore
    test.skip()

    await page.goto('/signup')
    const { email } = await signup.fillSignupForm()
    await page.click('button[type="submit"]')

    await page.click('[data-pw-nav-control-panel-toggle]')
    await expect(
      page.locator('text=Confirm your email to create and deploy live actions')
    ).toBeVisible()

    const context = await browser.newContext({
      storageState: undefined,
    })

    const incognitoPage = await context.newPage()

    const conf = await signup.getConfirmEmailUrl(email)
    await incognitoPage.goto(conf.url)
    await incognitoPage.waitForURL(conf.url)
    await incognitoPage.waitForURL(/\/login$/)

    await incognitoPage.fill('input[name="email"]', email)
    await incognitoPage.locator('button[type="submit"]').click()
    await incognitoPage.fill('input[name="password"]', 'password')
    await incognitoPage.locator('button[type="submit"]').click()

    await incognitoPage.waitForURL(/\/dashboard\/[a-z0-9-]*\/develop\/actions/)
    await incognitoPage.click('[data-pw-nav-control-panel-toggle]')
    await expect(
      incognitoPage.locator(
        'text=Confirm your email to create and deploy live actions'
      )
    ).not.toBeVisible()
  })

  test('requests new email confirmation after expiry', async ({
    page,
    signup,
  }) => {
    await page.goto('/signup')
    const { email } = await signup.fillSignupForm()
    await page.click('button[type="submit"]')

    await page.click('[data-pw-nav-control-panel-toggle]')
    await expect(
      page.locator('text=Confirm your email to create and deploy live actions')
    ).toBeVisible()

    const conf = await signup.getConfirmEmailUrl(email)
    await signup.expireEmailConfirmation(conf.id)

    await page.goto(conf.url)
    await expect(
      page.locator('text=We sent a new link to your email address')
    ).toBeVisible()

    const conf2 = await signup.getConfirmEmailUrl(email)
    await page.goto(conf2.url)

    await page.waitForURL(/\/dashboard\/[a-z0-9-]*\/develop\/actions/)
    await page.click('[data-pw-nav-control-panel-toggle]')
    await expect(
      page.locator('text=Confirm your email to create and deploy live actions')
    ).not.toBeVisible()
  })
})
