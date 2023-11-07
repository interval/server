import Interval, { io, Layout, Page as IntervalPage } from '@interval/sdk/dist'
import { expect } from '@playwright/test'
import { encryptPassword } from '~/server/auth'
import {
  config,
  prisma,
  dashboardUrl,
  ENDPOINT_URL,
  logIn,
  sleep,
} from '../_setup'
import { test } from '../_fixtures'
import {
  DEVELOPMENT_ORG_ENV_NAME,
  DEVELOPMENT_ORG_ENV_SLUG,
  PRODUCTION_ORG_ENV_NAME,
  PRODUCTION_ORG_ENV_SLUG,
} from '~/utils/environments'

const OWNER_ID = 'ACTION_ACCESS_OWNER_ID'
const ORG_ID = 'ACTION_ACCESS_TEST_ORG'
const ORG_SLUG = 'action-access-test-org'
const LIVE_API_KEY_ID = 'ACTION_ACCESS_LIVE_KEY'
const LIVE_API_KEY = 'live_action_access_test_key'
const ORG_ACTION_SLUG = 'ORG_ACTION_SLUG'
const ENG_ACTION_SLUG = 'ENG_ACTION_SLUG'
const SUPPORT_ACTION_SLUG = 'SUPPORT_ACTION_SLUG'
const ORG_GROUP_SLUG = 'ORG_GROUP_SLUG'
const ENG_GROUP_SLUG = 'ENG_GROUP_SLUG'
const SUPPORT_GROUP_SLUG = 'SUPPORT_GROUP_SLUG'
const MIXED_GROUP_SLUG = 'MIXED_GROUP_SLUG'

test.skip(!!process.env.SDK_VERSION && process.env.SDK_VERSION !== 'main')
test.skip(!!process.env.GHOST_MODE)

test.describe('Action access', () => {
  test.describe('Organization owner', () => {
    test('runs an action with org-level access', async ({
      page,
      transactions,
    }) => {
      await page.goto(await dashboardUrl('/', ORG_SLUG))
      await transactions.run(ORG_ACTION_SLUG)
      await transactions.expectSuccess()
    })

    test('runs a page with org-level access', async ({
      page,
      transactions,
    }) => {
      await page.goto(await dashboardUrl('/', ORG_SLUG))
      await transactions.navigate(ORG_GROUP_SLUG)
      await expect(page.locator('text=Org group access handler')).toBeVisible()
    })

    test('cannot view or run group-restricted actions or pages as an admin', async ({
      page,
      transactions,
    }) => {
      await page.goto(await dashboardUrl('/', ORG_SLUG))
      await expect(
        page.locator(`[data-pw-run-slug='${SUPPORT_ACTION_SLUG}']`)
      ).toBeHidden()
      await expect(
        page.locator(`[data-pw-action-group='${ENG_GROUP_SLUG}']`)
      ).toBeHidden()
      await transactions.visit(SUPPORT_ACTION_SLUG, ORG_SLUG)
      await transactions.expectNotFound()
    })
  })

  test.describe('Group member', () => {
    test.beforeAll(async ({ browser }) => {
      // Setup has already run, so new contexts will start with the default session.
      // Initialize a new context with a blank session and log in as a user in the Support group.
      const supportContext = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      })

      const supportPage = await supportContext.newPage()
      await logIn(supportPage, config.supportLogin)
    })

    test.use({ storageState: config.supportLogin.sessionPath })

    test('runs an action with org-level access', async ({
      page,
      transactions,
    }) => {
      await page.goto(await dashboardUrl('/', ORG_SLUG))
      await transactions.run(ORG_ACTION_SLUG)
      await transactions.expectSuccess()
    })

    test('only sees its own actions and groups', async ({ page }) => {
      await page.goto(await dashboardUrl('/', ORG_SLUG))

      await expect(
        page.locator(`[data-pw-run-slug='${ENG_ACTION_SLUG}']`)
      ).toBeHidden()
      await expect(
        page.locator(`[data-pw-run-slug='${SUPPORT_ACTION_SLUG}']`)
      ).toBeVisible()
      await expect(
        page.locator(`[data-pw-run-slug='${ORG_ACTION_SLUG}']`)
      ).toBeVisible()

      await expect(
        page.locator(`[data-pw-action-group='${ENG_GROUP_SLUG}']`)
      ).toBeHidden()
      await expect(
        page.locator(`[data-pw-action-group='${SUPPORT_GROUP_SLUG}']`)
      ).toBeVisible()
      await expect(
        page.locator(`[data-pw-action-group='${ORG_GROUP_SLUG}']`)
      ).toBeVisible()
    })

    test('can run an action it has access to', async ({
      page,
      transactions,
    }) => {
      await page.goto(await dashboardUrl('/', ORG_SLUG))
      await transactions.visit(SUPPORT_ACTION_SLUG, ORG_SLUG)
      await transactions.expectSuccess()
    })

    test("can't run an action it doesn't have access to", async ({
      page,
      transactions,
    }) => {
      await page.goto(await dashboardUrl('/', ORG_SLUG))
      await transactions.visit(ENG_ACTION_SLUG, ORG_SLUG)
      await transactions.expectNotFound()
    })

    test('does not see groups without access in navbar', async ({ page }) => {
      await page.goto(await dashboardUrl('/', ORG_SLUG))
      await expect(
        page.locator(`#desktop-nav li:has-text("${MIXED_GROUP_SLUG}")`)
      ).toBeVisible()
      await expect(
        page.locator(`#desktop-nav li:has-text("${SUPPORT_GROUP_SLUG}")`)
      ).toBeVisible()
      await expect(
        page.locator(`#desktop-nav li:has-text("${ENG_GROUP_SLUG}")`)
      ).toBeHidden()
    })

    test('can run an action it has access to in a group it does not have access to', async ({
      page,
      transactions,
    }) => {
      await page.goto(await dashboardUrl('/', ORG_SLUG))
      await transactions.navigate(MIXED_GROUP_SLUG)
      // this will fail if the handler is shown instead of the actions list
      await transactions.run([MIXED_GROUP_SLUG, SUPPORT_ACTION_SLUG].join('/'))

      await page.goto(await dashboardUrl('/', ORG_SLUG))
      await transactions.navigate(MIXED_GROUP_SLUG)
      // this will fail if the handler is shown instead of the actions list
      await transactions.run([MIXED_GROUP_SLUG, ORG_ACTION_SLUG].join('/'))
    })
  })
})

/**
 * - Create a separate organization for these tests
 * - Create a support user
 * - Create support + engineering groups
 * - Start a new Interval app with various permissions configurations
 */
test.beforeAll(async () => {
  // Just in case cleanup failed from previous run
  await cleanup()

  const user = await prisma.user.findUnique({
    where: {
      email: config.login.email,
    },
  })

  if (!user) throw new Error("Couldn't find user")

  const org = await prisma.organization.create({
    data: {
      id: ORG_ID,
      name: 'Action access test org',
      slug: ORG_SLUG,
      owner: {
        create: {
          id: OWNER_ID,
          email: 'action-owner@interval.com',
        },
      },
      private: { create: {} },
      environments: {
        createMany: {
          data: [
            { name: PRODUCTION_ORG_ENV_NAME, slug: PRODUCTION_ORG_ENV_SLUG },
            { name: DEVELOPMENT_ORG_ENV_NAME, slug: DEVELOPMENT_ORG_ENV_SLUG },
          ],
        },
      },
      userOrganizationAccess: {
        create: {
          user: {
            connect: { id: user.id },
          },
          permissions: ['ADMIN'],
        },
      },
    },
    include: {
      environments: true,
    },
  })

  const prodEnv = org.environments.find(
    env => env.slug === PRODUCTION_ORG_ENV_SLUG
  )

  if (!prodEnv) {
    throw new Error('Unable to find production environment')
  }

  await prisma.userAccessGroup.create({
    data: {
      id: 'ENGINEERS_GROUP',
      name: 'Engineers',
      slug: 'engineers',
      organization: { connect: { id: ORG_ID } },
    },
  })

  const supportGroup = await prisma.userAccessGroup.create({
    data: {
      id: 'SUPPORT_GROUP',
      name: 'Support',
      slug: 'support',
      organization: { connect: { id: ORG_ID } },
    },
  })

  const supportUser = await prisma.user.create({
    data: {
      firstName: 'Support',
      lastName: 'User',
      email: config.supportLogin.email,
      password: encryptPassword(config.supportLogin.password),
      userOrganizationAccess: {
        create: {
          organizationId: ORG_ID,
          permissions: ['ACTION_RUNNER'],
        },
      },
    },
  })

  await prisma.userAccessGroupMembership.create({
    data: {
      userOrganizationAccess: {
        connect: {
          userId_organizationId: {
            userId: supportUser.id,
            organizationId: ORG_ID,
          },
        },
      },
      group: { connect: { id: supportGroup.id } },
    },
  })

  await prisma.apiKey.create({
    data: {
      id: LIVE_API_KEY_ID,
      key: encryptPassword(LIVE_API_KEY),
      organization: { connect: { id: ORG_ID } },
      user: { connect: { id: user.id } },
      usageEnvironment: 'PRODUCTION',
      organizationEnvironment: { connect: { id: prodEnv.id } },
    },
  })

  const interval = new Interval({
    apiKey: LIVE_API_KEY,
    logLevel: 'debug',
    endpoint: ENDPOINT_URL,
    routes: {
      [ORG_ACTION_SLUG]: async () => {
        return {
          Hello: 'organization!',
        }
      },

      [ORG_GROUP_SLUG]: new IntervalPage({
        name: ORG_GROUP_SLUG,
        handler: async () => {
          return new Layout({
            title: 'Org group access handler',
          })
        },
        routes: {
          [ORG_ACTION_SLUG]: {
            handler: async () => {
              return {
                Hello: 'organization!',
              }
            },
          },
        },
      }),

      [ENG_GROUP_SLUG]: new IntervalPage({
        name: ENG_GROUP_SLUG,
        access: {
          teams: ['engineers'],
        },
        routes: {
          [ENG_ACTION_SLUG]: {
            handler: async () => {
              return {
                Hello: 'Engineers group!',
              }
            },
          },
        },
      }),

      [SUPPORT_GROUP_SLUG]: new IntervalPage({
        name: SUPPORT_GROUP_SLUG,
        access: {
          teams: ['support'],
        },
        routes: {
          [SUPPORT_ACTION_SLUG]: {
            handler: async () => {
              return {
                Hello: 'Support group!',
              }
            },
          },
        },
      }),

      [MIXED_GROUP_SLUG]: new IntervalPage({
        name: MIXED_GROUP_SLUG,
        access: {
          teams: ['engineers'],
        },
        handler: async () => {
          return new Layout({
            title: 'Mixed access handler',
            children: [io.display.markdown('')],
          })
        },
        routes: {
          [SUPPORT_ACTION_SLUG]: {
            access: {
              teams: ['support'],
            },
            handler: async () => {
              return {
                Hello: 'Support group!',
              }
            },
          },
          [ORG_ACTION_SLUG]: {
            access: 'entire-organization',
            handler: async () => {
              return {
                Hello: 'Organization!',
              }
            },
          },
        },
      }),

      [ENG_ACTION_SLUG]: {
        access: {
          teams: ['engineers'],
        },
        handler: async () => {
          return {
            Hello: 'engineers!',
          }
        },
      },
      [SUPPORT_ACTION_SLUG]: {
        access: {
          teams: ['support'],
        },
        handler: async () => {
          return {
            Hello: 'support!',
          }
        },
      },
    },
  })

  interval.listen()
})

async function cleanup() {
  await prisma.transaction.deleteMany({
    where: {
      action: {
        organizationId: ORG_ID,
      },
    },
  })

  await prisma.actionAccess.deleteMany({
    where: {
      userAccessGroup: {
        organizationId: ORG_ID,
      },
    },
  })

  await prisma.actionMetadata.deleteMany({
    where: {
      action: {
        organizationId: ORG_ID,
      },
    },
  })

  await prisma.action.deleteMany({
    where: {
      organizationId: ORG_ID,
    },
  })

  await prisma.actionGroupAccess.deleteMany({
    where: {
      userAccessGroup: {
        organizationId: ORG_ID,
      },
    },
  })
  await prisma.actionGroupMetadata.deleteMany({
    where: {
      group: {
        organizationId: ORG_ID,
      },
    },
  })

  await prisma.actionGroup.deleteMany({
    where: {
      organizationId: ORG_ID,
    },
  })

  await prisma.hostInstance.deleteMany({
    where: {
      organizationId: ORG_ID,
    },
  })

  await prisma.apiKey.deleteMany({
    where: {
      id: LIVE_API_KEY_ID,
    },
  })

  await prisma.userAccessGroupMembership.deleteMany({
    where: {
      userOrganizationAccess: {
        organizationId: ORG_ID,
      },
    },
  })

  await prisma.userAccessGroup.deleteMany({
    where: {
      organizationId: ORG_ID,
    },
  })

  await prisma.userOrganizationAccess.deleteMany({
    where: {
      organizationId: ORG_ID,
    },
  })

  await prisma.apiKey.deleteMany({
    where: {
      organizationId: ORG_ID,
    },
  })

  await prisma.organizationEnvironment.deleteMany({
    where: {
      organizationId: ORG_ID,
    },
  })

  await prisma.organizationFeatureFlag.deleteMany({
    where: {
      organizationId: ORG_ID,
    },
  })

  await prisma.organization.deleteMany({
    where: {
      id: ORG_ID,
    },
  })

  await prisma.userSession.deleteMany({
    where: {
      OR: [
        {
          userId: OWNER_ID,
        },
        {
          user: {
            email: config.supportLogin.email,
          },
        },
      ],
    },
  })

  await prisma.user.deleteMany({
    where: {
      OR: [
        {
          id: OWNER_ID,
        },
        {
          email: config.supportLogin.email,
        },
      ],
    },
  })
}

test.afterAll(async () => {
  // pause after the final test, otherwise we get a race condition where transactions
  // may be created after cleanup begins and we get foreign key errors.
  await sleep(500).then(cleanup)
})
