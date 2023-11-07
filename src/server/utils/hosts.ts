import fetch from 'node-fetch'
import { HttpHost, Prisma } from '@prisma/client'
import prisma from '../prisma'
import { logger } from '~/server/utils/logger'

export async function checkHttpHost(httpHost: HttpHost) {
  let success = false
  try {
    const response = await fetch(httpHost.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        httpHostId: httpHost.id,
      }),
    })

    success = response.ok

    if (!success) {
      logger.error(
        'checkHttpHost received unsuccessful status code for httpHost',
        {
          httpHostId: httpHost.id,
          responseStatus: response.status,
        }
      )
    }
  } catch (error) {
    logger.error('checkHttpHost failed to reach url for httpHost', {
      httpHostId: httpHost.id,
      error,
    })
  }

  return await prisma.httpHost.update({
    where: {
      id: httpHost.id,
    },
    data: {
      status: success ? 'ONLINE' : 'UNREACHABLE',
    },
  })
}

export async function checkHttpHosts(where?: Prisma.HttpHostWhereInput) {
  try {
    const hosts = await prisma.httpHost.findMany({
      where: {
        deletedAt: null,
        ...where,
      },
    })

    await Promise.all(
      hosts.map(async host => {
        await checkHttpHost(host)
        // TODO: Notify users when their actions are unreachable
      })
    )
  } catch (error) {
    logger.error('checkHttpHosts encountered an error', { error })
  }
}

export async function checkUnreachableHttpHosts() {
  return await checkHttpHosts({
    status: 'UNREACHABLE',
  })
}

export async function checkNotUnreachableHttpHosts() {
  return await checkHttpHosts({
    status: {
      not: 'UNREACHABLE',
    },
  })
}
