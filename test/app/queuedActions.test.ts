import Interval from '@interval/sdk/dist'
import { prisma, config, dashboardUrl, sleep } from '../_setup'
import { test } from '../_fixtures'
import { dateTimeFormatter } from '../../src/utils/formatters'

test.skip(!!process.env.SDK_VERSION && process.env.SDK_VERSION !== 'main')
test.skip(!!process.env.GHOST_MODE)

test.describe('queuedActions', () => {
  let interval: Interval | undefined

  test.beforeAll(async () => {
    interval = new Interval({
      apiKey: config.liveApiKey,
      logLevel: 'debug',
      endpoint: `${config.url.replace('http', 'ws')}/websocket`,
      routes: {
        echoParams: async (_, ctx) => {
          return ctx.params
        },
      },
    })

    interval.listen()

    console.log('listening')

    const user = await prisma.user.findUnique({
      where: {
        email: config.login.email,
      },
      include: {
        organizations: {
          include: {
            environments: true,
          },
        },
      },
    })

    if (!user) throw new Error('No test runner')
  })

  test.beforeEach(async () => {
    const user = await prisma.user.findUnique({
      where: {
        email: config.login.email,
      },
      include: {
        organizations: true,
      },
    })

    if (!user) throw new Error('No test runner')

    await prisma.queuedAction.deleteMany({
      where: {
        action: {
          slug: 'echoParams',
          organizationId: user.organizations[0].id,
        },
      },
    })
  })

  test.afterAll(async () => {
    const user = await prisma.user.findUnique({
      where: {
        email: config.login.email,
      },
      include: {
        organizations: true,
      },
    })

    if (!user) throw new Error('No test runner')

    await prisma.actionMetadata.deleteMany({
      where: {
        action: {
          slug: 'echoParams',
          organizationId: user.organizations[0].id,
        },
      },
    })
  })

  test('rich params and returns', async ({ page, transactions }) => {
    const params = {
      true: true,
      false: false,
      number: 1337,
      string: 'string',
      date: new Date(),
      null: null,
      undefined: undefined,
    }

    while (!interval?.isConnected) {
      await sleep(500)
    }

    await interval?.enqueue('echoParams', {
      params,
    })

    await page.goto(await dashboardUrl('/'))
    await page.locator('[data-pw-queued-action-slug="echoParams"] a').click()

    const { undefined: _undefined, date, ...rest } = params

    await transactions.expectSuccess({
      ...rest,
      null: '',
      date: dateTimeFormatter.format(date),
    })
  })
})
