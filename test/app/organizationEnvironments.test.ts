import { expect } from '@playwright/test'
import Interval from '@interval/sdk/dist'
import { prisma, config, dashboardUrl } from '../_setup'
import { test } from '../_fixtures'
import { encryptPassword } from '~/server/auth'

test.skip(!!process.env.SDK_VERSION && process.env.SDK_VERSION !== 'main')
test.skip(!!process.env.GHOST_MODE)

const STAGING_ENV_KEY = 'live_asdlfkajsdflkajsdflkasjdflaksdf'

test.describe('Organization environment', () => {
  let interval: Interval | undefined

  test.beforeAll(async () => {
    const user = await prisma.user.findUnique({
      where: {
        email: config.login.email,
      },
      include: {
        organizations: true,
      },
    })

    if (!user) throw new Error('No test runner')

    const org = user.organizations[0]

    if (!org) throw new Error('No test organization')

    let orgEnv = await prisma.organizationEnvironment.findFirst({
      where: {
        slug: 'staging',
        organization: { id: org.id },
      },
    })

    if (!orgEnv) {
      orgEnv = await prisma.organizationEnvironment.create({
        data: {
          name: 'Staging',
          slug: 'staging',
          organization: { connect: { id: org.id } },
        },
      })
    }

    let apiKey = await prisma.apiKey.findFirst({
      where: {
        usageEnvironment: 'PRODUCTION',
        user: { id: user.id },
        organization: { id: org.id },
        organizationEnvironment: { id: orgEnv.id },
        key: encryptPassword(STAGING_ENV_KEY),
      },
    })

    if (!apiKey) {
      apiKey = await prisma.apiKey.create({
        data: {
          usageEnvironment: 'PRODUCTION',
          user: { connect: { id: user.id } },
          organization: { connect: { id: org.id } },
          organizationEnvironment: { connect: { id: orgEnv.id } },
          key: encryptPassword(STAGING_ENV_KEY),
        },
      })
    }

    interval = new Interval({
      apiKey: STAGING_ENV_KEY,
      logLevel: 'debug',
      endpoint: `${config.url.replace('http', 'ws')}/websocket`,
      routes: {
        staging_action_test: async () => {
          return 'Hello, staging!'
        },
      },
    })

    interval.listen()
  })

  test("Doesn't show in production environment", async ({ page }) => {
    await page.goto(await dashboardUrl())
    await expect(
      page.locator(`[data-pw-run-slug='staging_action_test']`)
    ).toBeHidden()
  })

  test('Shows in Staging environment', async ({ page, transactions }) => {
    await page.goto(await dashboardUrl(undefined, 'test-runner+staging'))
    await transactions.run('staging_action_test')
    await transactions.expectSuccess('Hello, staging!')
  })
})
