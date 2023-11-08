import fetch from 'cross-fetch'
import {
  Prisma,
  UsageEnvironment,
  HostInstance,
  Transaction,
} from '@prisma/client'
import { SerializableRecord } from '@interval/sdk/dist/ioSchema'
import prisma from '~/server/prisma'
import sleep from './sleep'
import { getDashboardPath, usageEnvironmentToMode } from '~/utils/actions'
import env from '~/env'
import { TransactionRunner } from '~/utils/user'
import { TransactionWithAction } from '~/utils/types'
import { logger } from '~/server/utils/logger'
import { makeApiCall } from './wss'

export async function getCurrentHostInstance(
  actionOrGroup:
    | Prisma.ActionGetPayload<{
        include: {
          hostInstances: true
          httpHosts: true
        }
      }>
    | Prisma.ActionGroupGetPayload<{
        include: {
          hostInstances: true
          httpHosts: true
        }
      }>
): Promise<HostInstance> {
  const hostInstance = actionOrGroup.hostInstances.find(
    hi => hi.status === 'ONLINE'
  )
  if (hostInstance) return hostInstance

  // Try "ONLINE" HTTP hosts first
  let httpHost = actionOrGroup.httpHosts.find(hh => hh.status === 'ONLINE')
  if (!httpHost) {
    // Fall back to "UNREACHABLE" hosts if none found
    httpHost = actionOrGroup.httpHosts.find(hh => hh.status === 'UNREACHABLE')
  }
  if (httpHost) {
    try {
      let timedOut = false
      const httpInitializationTimeoutMs = 60_000
      let timeoutTimeout: NodeJS.Timeout | null = setTimeout(() => {
        timedOut = true
      }, httpInitializationTimeoutMs)

      const httpHostRequest = await prisma.httpHostRequest.create({
        data: {
          httpHostId: httpHost.id,
          actionId: 'backgroundable' in actionOrGroup ? actionOrGroup.id : null,
          actionGroupId:
            'hasHandler' in actionOrGroup ? actionOrGroup.id : null,
        },
      })

      fetch(httpHost.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: httpHostRequest.id,
        }),
      })
        .then(async response => {
          if (!response.ok)
            throw new Error(
              `Received ${response.status} from initialization request`
            )
        })
        .catch(error => {
          logger.error('Error receiving HTTP response from request host', {
            httpHostRequestId: httpHostRequest.id,
            url: httpHost?.url,
            error,
          })
        })

      // Poll for HostInstance connection
      while (!timedOut) {
        const hostInstance = await prisma.hostInstance.findFirst({
          where: {
            httpHostRequest: {
              id: httpHostRequest.id,
            },
          },
        })

        if (hostInstance) {
          clearTimeout(timeoutTimeout)
          timeoutTimeout = null
          return hostInstance
        }
        await sleep(500)
      }

      // Did not respond within timeout
      await prisma.httpHostRequest.update({
        where: {
          id: httpHostRequest.id,
        },
        data: {
          invalidAt: new Date(),
        },
      })
    } catch (error) {
      logger.error('Failed initializing HTTP Host', {
        httpHostId: httpHost.id,
        error,
      })
      throw error
    }
  }

  throw new Error(
    `HostInstance and HttpHostInstance both undefined for action or group with ID ${actionOrGroup.id}`
  )
}

export function getDashboardUrl({
  orgSlug,
  envSlug,
  environment,
}: {
  orgSlug: string
  envSlug: string | undefined | null
  environment: UsageEnvironment | 'ANON_CONSOLE'
}): string {
  const mode = usageEnvironmentToMode(environment)
  const path = getDashboardPath({
    envSlug,
    orgSlug,
    mode,
  })
  return `${env.APP_URL}${path}`
}

export async function startTransaction(
  transaction: TransactionWithAction,
  runner: TransactionRunner,
  {
    clientId,
    params = {},
    paramsMeta,
  }: { clientId?: string; params?: SerializableRecord; paramsMeta?: any } = {}
) {
  return makeApiCall(
    '/api/transactions/start',
    JSON.stringify({
      transactionId: transaction.id,
      runnerId: runner.id,
      clientId,
      params,
      paramsMeta,
    })
  )
}

export async function cancelTransaction(transaction: Transaction) {
  return makeApiCall(
    '/api/transactions/cancel',
    JSON.stringify({
      transactionId: transaction.id,
    })
  )
}
