import { chromium, Page } from '@playwright/test'
import {
  Organization,
  OrganizationEnvironment,
  PrismaClient,
} from '@prisma/client'
import { createUser } from '~/server/user'
import env from '../src/env'
import setupHost, { getLocalConfig } from './releases'
import { encryptPassword } from '~/server/auth'
import {
  DEVELOPMENT_ORG_ENV_SLUG,
  PRODUCTION_ORG_ENV_SLUG,
} from '~/utils/environments'

export const prisma = new PrismaClient()

export const config = {
  url: env.APP_URL,
  orgSlug: 'test-runner',
  login: {
    email: 'test-runner@interval.com',
    password: 'password',
    sessionPath: 'test/.session.json',
  },
  supportLogin: {
    email: 'test-runner-support-group@interval.com',
    password: 'password',
    sessionPath: 'test/.session-support.json',
  },
  apiKey: 'd790283e-d845-48f6-95f2-27c8a7119b16',
  liveApiKey: 'live_test_runner_test_api_key',
  statelessPort: 3334,
  promoCode: 'TEST_CODE',
}

const disableAppendUi = !!process.env.NO_TRANSACTION_APPEND_UI

export const isAppendUIEnabled =
  (!process.env.SDK_VERSION ||
    process.env.SDK_VERSION === 'main' ||
    process.env.SDK_VERSION >= '0.38.0') &&
  !disableAppendUi

const url = new URL(env.APP_URL)
url.protocol = url.protocol.replace('http', 'ws')
url.pathname = '/websocket'

export const ENDPOINT_URL = url.toString()

export function appUrl(path: string): string {
  const url = new URL(env.APP_URL)
  url.pathname = path
  return url.toString()
}

async function getDefaultOrgSlug(): Promise<string> {
  const localConfig = getLocalConfig()
  if (process.env.GHOST_MODE && localConfig) {
    const ghostConfig = await localConfig.get()
    if (ghostConfig) {
      const ghostOrg = await prisma.organization.findUnique({
        where: {
          id: ghostConfig?.ghostOrgId,
        },
      })

      if (!ghostOrg) {
        throw new Error('Failed finding ghost organization')
      }

      return ghostOrg.slug
    } else {
      throw new Error('Failed finding localConfig')
    }
  } else {
    return config.orgSlug
  }
}

/**
 * Explicitly adds the organization slug to the URL to support
 * running tests against multiple organizations simultaneously
 */
export async function dashboardUrl(
  path = '',
  orgSlug?: string
): Promise<string> {
  if (path?.startsWith('/')) {
    path = path.substring(1)
  }

  if (!orgSlug) {
    orgSlug = await getDefaultOrgSlug()
  }

  return process.env.GHOST_MODE
    ? appUrl(`/develop/${orgSlug}/${path}`)
    : appUrl(`/dashboard/${orgSlug}/${path}`)
}

export async function consoleUrl(orgSlug?: string): Promise<string> {
  if (!orgSlug) {
    orgSlug = await getDefaultOrgSlug()
  }

  return process.env.GHOST_MODE
    ? appUrl(`/develop/${orgSlug}`)
    : appUrl(`/dashboard/${orgSlug}/develop/actions`)
}

export async function logIn(page: Page, login: typeof config.login) {
  await page.goto(appUrl('/login'))
  await page.fill('input[name="email"]', login.email)
  await page.click('button[type="submit"]')
  await page.fill('input[name="password"]', login.password)
  await page.click('button[type="submit"]')
  await page.waitForNavigation()
  await page.goto(await dashboardUrl())
  await page.waitForLoadState('networkidle')
  await page.context().storageState({ path: login.sessionPath })
  console.log('✅ Logged in as', login.email)
}

async function globalSetup() {
  if (process.env.GHOST_MODE) {
    console.log('Testing in ghost mode...')
    console.log('Enabling GHOST_MODE_ENABLED feature flag...')
    await prisma.globalFeatureFlag.upsert({
      create: {
        flag: 'GHOST_MODE_ENABLED',
        enabled: true,
      },
      update: {
        enabled: true,
      },
      where: {
        flag: 'GHOST_MODE_ENABLED',
      },
    })
  } else {
    console.log('Creating test runner user...')
    await ensureTestUser()

    console.log('Logging in...')
    const browser = await chromium.launch()
    const page = await browser.newPage()
    await logIn(page, config.login)
    await browser.close()
  }

  await setupHost()
}

export function atLeastVersion(version: string): boolean {
  const { SDK_VERSION } = process.env

  return !SDK_VERSION || SDK_VERSION >= version
}

async function ensureTestUser() {
  let user: {
    id: string
    organizations: (Organization & {
      environments: OrganizationEnvironment[]
    })[]
  } | null

  user = await prisma.user.findFirst({
    where: { email: config.login.email },
    select: {
      id: true,
      organizations: {
        include: {
          environments: true,
        },
      },
    },
  })

  if (!user) {
    user = await createUser({
      data: {
        firstName: 'Test',
        lastName: 'Runner',
        email: config.login.email,
      },
      password: config.login.password,
    })
  }

  await prisma.organizationFeatureFlag.upsert({
    where: {
      organizationId_flag: {
        organizationId: user.organizations[0].id,
        flag: 'TRANSACTION_LEGACY_NO_APPEND_UI',
      },
    },
    update: {
      enabled: disableAppendUi,
    },
    create: {
      organizationId: user.organizations[0].id,
      flag: 'TRANSACTION_LEGACY_NO_APPEND_UI',
      enabled: disableAppendUi,
    },
  })

  let key = await prisma.apiKey.findFirst({
    where: {
      userId: user.id,
      organizationId: user.organizations[0].id,
      key: config.apiKey,
    },
  })

  const devEnv = user.organizations[0].environments.find(
    env => env.slug === DEVELOPMENT_ORG_ENV_SLUG
  )

  if (!devEnv) {
    throw new Error('Unable to find development organization environment')
  }

  if (!key) {
    key = await prisma.apiKey.create({
      data: {
        key: config.apiKey,
        label: 'test key',
        usageEnvironment: 'DEVELOPMENT',
        user: {
          connect: {
            id: user.id,
          },
        },
        organizationEnvironment: {
          connect: {
            id: devEnv.id,
          },
        },
        organization: {
          connect: {
            id: user.organizations[0].id,
          },
        },
      },
    })
  }

  if (!key) throw new Error('Unable to create API key')

  let liveKey = await prisma.apiKey.findFirst({
    where: {
      userId: user.id,
      organizationId: user.organizations[0].id,
      key: encryptPassword(config.liveApiKey),
    },
  })

  const liveEnv = user.organizations[0].environments.find(
    env => env.slug === PRODUCTION_ORG_ENV_SLUG
  )

  if (!liveEnv) {
    throw new Error('Unable to find development organization environment')
  }

  if (!liveKey) {
    liveKey = await prisma.apiKey.create({
      data: {
        key: encryptPassword(config.liveApiKey),
        label: 'test key',
        usageEnvironment: 'PRODUCTION',
        user: {
          connect: {
            id: user.id,
          },
        },
        organizationEnvironment: {
          connect: {
            id: liveEnv.id,
          },
        },
        organization: {
          connect: {
            id: user.organizations[0].id,
          },
        },
      },
    })
  }

  if (!liveKey) throw new Error('Unable to create live API key')

  await prisma.organizationPromoCode.upsert({
    where: {
      code: config.promoCode,
    },
    create: {
      code: config.promoCode,
      organizations: {
        connect: {
          id: user.organizations[0].id,
        },
      },
    },
    update: {},
  })
}

export const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))

export default globalSetup
