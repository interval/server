import { prisma, config, dashboardUrl, atLeastVersion } from '../_setup'
import { test } from '../_fixtures'
import { checkHttpHost } from '~/server/utils/hosts'

import { expect } from '@playwright/test'

test.skip(!atLeastVersion('0.20.0'))
test.skip(!!process.env.GHOST_MODE)

test.describe.serial('Stateless/serverless HTTP transactions', () => {
  const url = `http://localhost:${config.statelessPort}`

  test.beforeAll(async () => {
    const organization = await prisma.organization.findUnique({
      where: {
        slug: config.orgSlug,
      },
    })

    if (!organization) {
      throw new Error('Test runner organization not found')
    }

    let httpHost = await prisma.httpHost.upsert({
      where: {
        organizationId_url: {
          organizationId: organization.id,
          url,
        },
      },
      update: {
        deletedAt: null,
      },
      create: {
        status: 'OFFLINE',
        organization: { connect: { id: organization.id } },
        url,
      },
    })

    httpHost = await checkHttpHost(httpHost)

    if (httpHost.status !== 'ONLINE') {
      throw new Error('Failed to connect to HTTP host')
    }
  })

  test.afterAll(async () => {
    const organization = await prisma.organization.findUnique({
      where: {
        slug: config.orgSlug,
      },
    })

    if (!organization) {
      throw new Error('Test runner organization not found')
    }

    try {
      await prisma.httpHost.update({
        where: {
          organizationId_url: {
            organizationId: organization.id,
            url,
          },
        },
        data: {
          status: 'OFFLINE',
          deletedAt: new Date(),
        },
      })
    } catch (err) {
      console.error('Failed to soft delete HTTP host', err)
    }
  })

  test.describe('Serverless hosts', () => {
    test('Actions work', async ({ page, transactions }) => {
      await page.goto(await dashboardUrl())
      await transactions.run('hello_http')
      await transactions.expectSuccess('Hello, from HTTP!')
    })

    test.describe('Serverless pages work', () => {
      test.skip(!atLeastVersion('0.37.1'))

      test('Serverless page handler works', async ({ page, transactions }) => {
        await page.goto(await dashboardUrl())
        await transactions.navigate('hello_http_pages')
        await expect(page.locator('text=Inside a page via HTTP')).toBeVisible()
        await expect(page.locator('text=Neat!')).toBeVisible()
      })

      test('Serverless sub actions work', async ({ page, transactions }) => {
        await page.goto(await dashboardUrl())
        await transactions.navigate('hello_http_pages')
        await transactions.run('hello_http_pages/sub_action')
        await transactions.expectSuccess('Hello, from a sub action!')
      })
    })
  })
})
