import { JSONValue } from 'superjson/dist/types'
import { Transaction } from '@prisma/client'
import {
  SerializableRecord,
  IO_RENDER,
  T_IO_RESPONSE,
} from '@interval/sdk/dist/ioSchema'
import superjson from '~/utils/superjson'
import prisma from '~/server/prisma'
import { isFlagEnabled } from '~/server/utils/featureFlags'
import { getOrgEnvSlug, PRODUCTION_ORG_ENV_SLUG } from '~/utils/environments'
import { getStartTransactionUser, TransactionRunner } from '~/utils/user'
import { getActionUrl } from '~/utils/actions'
import { TransactionWithAction } from '~/utils/types'
import type { ActionEnvironment } from '@interval/sdk/dist/internalRpcSchema'
import {
  connectedHosts,
  pendingIOCalls,
  transactionLoadingStates,
  transactionRedirects,
  ConnectedHost,
} from './processVars'
import { logger } from '~/server/utils/logger'
import env from '~/env'

export async function startTransaction(
  transaction: TransactionWithAction,
  runner: TransactionRunner,
  {
    params = {},
    paramsMeta,
  }: { params?: SerializableRecord; paramsMeta?: any } = {}
) {
  if (!transaction.hostInstanceId) {
    throw new Error(
      `WSS startTransaction: No hostInstanceId found for transaction ${transaction.id}`
    )
  }

  const host = connectedHosts.get(transaction.hostInstanceId)

  if (!host) {
    throw new Error(
      `WSS startTransaction: hostInstance.id not found in connectedHosts ${transaction.hostInstanceId}`
    )
  }

  const shouldUseAppendUi =
    !!host.sdkVersion &&
    host.sdkVersion >= '0.38.0' &&
    !(await isFlagEnabled(
      'TRANSACTION_LEGACY_NO_APPEND_UI',
      transaction.action.organizationId
    ))

  const mode = transaction.action.developerId
    ? host.organization.isGhostMode
      ? 'anon-console'
      : 'console'
    : 'live'
  const envSlug =
    mode === 'live' ? host.organizationEnvironment?.slug ?? null : null
  const orgEnvSlug = getOrgEnvSlug(envSlug, host.organization.slug)

  let deserializedParams = params
  try {
    deserializedParams = superjson.deserialize({
      json: params as JSONValue,
      meta: paramsMeta,
    })
  } catch (error) {
    logger.error('Error from SuperJSON deserialization', {
      error,
      meta: paramsMeta,
    })
  }

  return host.rpc.send('START_TRANSACTION', {
    transactionId: transaction.id,
    displayResolvesImmediately: shouldUseAppendUi,
    actionName: transaction.action.slug,
    action: {
      slug: transaction.action.slug,
      url: getActionUrl({
        base: env.APP_URL,
        orgEnvSlug,
        mode,
        slug: transaction.action.slug,
        absolute: true,
        params: deserializedParams,
      }),
    },
    environment: getActionEnvironment(host),
    user: getStartTransactionUser(runner),
    params,
    paramsMeta,
  })
}

export function freeTransactionCalls(transaction: Transaction) {
  transactionLoadingStates.delete(transaction.id)
  transactionRedirects.delete(transaction.id)
  pendingIOCalls.delete(transaction.id)
}

export async function cancelTransaction(transaction: Transaction) {
  if (!transaction.hostInstanceId) {
    throw new Error(
      `WSS cancelTransaction: No hostInstanceId found for transaction ${transaction.id}`
    )
  }

  const host = connectedHosts.get(transaction.hostInstanceId)

  prisma.transaction
    .update({
      where: {
        id: transaction.id,
      },
      data: {
        status: 'COMPLETED',
        resultStatus: 'CANCELED',
      },
    })
    .then(() => {
      // Just here to make sure this fires because these are lazy
    })
    .catch(error => {
      logger.error('Failed setting transaction status to canceled', {
        transactionId: transaction.id,
        error,
      })
    })

  if (!host) {
    logger.error(
      'cancelTransaction: hostInstance.id not found in connectedHosts',
      {
        transactionId: transaction.id,
        hostInstanceId: transaction.hostInstanceId,
      }
    )
    return
  }

  let id = 'UNKNOWN'
  let inputGroupKey = 'UNKNOWN'
  const lastIOCall = pendingIOCalls.get(transaction.id)
  if (lastIOCall) {
    try {
      const parsedCall = IO_RENDER.parse(JSON.parse(lastIOCall))
      id = parsedCall.id
      inputGroupKey = parsedCall.inputGroupKey
    } catch (error) {
      logger.error('Invalid transaction lastIOCall', { error })
    }
  }

  freeTransactionCalls(transaction)

  if (id === 'UNKNOWN') {
    logger.error('No valid IO call ID found for transaction ID', {
      transactionId: transaction.id,
    })
  }

  const response: T_IO_RESPONSE = {
    id,
    inputGroupKey,
    transactionId: transaction.id,
    kind: 'CANCELED',
    values: [],
  }

  return host.rpc
    .send('IO_RESPONSE', {
      transactionId: transaction.id,
      value: JSON.stringify(response),
    })
    .catch(error => {
      logger.error('Failed cancelling transaction', {
        error,
        transactionId: transaction.id,
      })
    })
}

export function getActionEnvironment(host: ConnectedHost): ActionEnvironment {
  if (host.sdkVersion && host.sdkVersion >= '0.38.1') {
    return host.organizationEnvironment?.slug ?? PRODUCTION_ORG_ENV_SLUG
  }

  switch (host.usageEnvironment) {
    case 'PRODUCTION':
      return 'live'
    case 'DEVELOPMENT':
      return 'development'
  }
}

/**
 * When the client disconnects from a non-backgroundable transaction
 * its status is set to CLIENT_CONNECTION_DROPPED. After maintaining this
 * state for a period of time without being updated, we will notify the action
 * host and clean up the transaction by marking it as finally canceled.
 *
 * We do this in phases like this instead of immediately cancel in order to
 * avoid race conditions when a client disconnects immediately after completing
 * the transaction, and also to handle clients that may briefly lose connection.
 */
export async function cancelClosedTransactions() {
  try {
    const tenMinutesAgo = new Date()
    tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10)
    const transactions = await prisma.transaction.findMany({
      where: {
        status: 'CLIENT_CONNECTION_DROPPED',
        updatedAt: {
          lt: tenMinutesAgo,
        },
      },
      include: {
        action: true,
      },
    })

    if (transactions.length > 0) {
      await prisma.transaction.updateMany({
        where: {
          id: {
            in: transactions.map(t => t.id),
          },
          resultStatus: null,
        },
        data: {
          resultStatus: 'CANCELED',
        },
      })

      await prisma.transaction.updateMany({
        where: {
          id: {
            in: transactions.map(t => t.id),
          },
        },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      })

      await Promise.all(transactions.map(t => cancelTransaction(t)))
    }
  } catch (error) {
    logger.error('Failed cancelling closed transactions', { error })
  }
}
