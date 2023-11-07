import express from 'express'
import { z } from 'zod'
import { NOTIFY } from '@interval/sdk/dist/internalRpcSchema'
import { loginWithApiKey } from '../auth'
import notify, { NotificationTransaction } from '../utils/notify'
import prisma from '../prisma'
import { logger } from '~/server/utils/logger'

const router = express.Router()

router.post('/', async (req, res) => {
  function sendResponse(
    statusCode: number,
    returns: z.input<(typeof NOTIFY)['returns']>
  ) {
    res.status(statusCode).send(returns)
  }

  const apiKey = req.headers.authorization?.split(' ')[1]

  if (!apiKey) {
    return sendResponse(401, {
      type: 'error',
      message: 'No API key provided.',
    })
  }

  const auth = await loginWithApiKey(apiKey)

  if (!auth) {
    return sendResponse(403, {
      type: 'error',
      message: 'Invalid API key provided.',
    })
  }

  let inputs: z.infer<(typeof NOTIFY)['inputs']>
  try {
    inputs = NOTIFY.inputs.parse(req.body)
  } catch (err) {
    return sendResponse(400, {
      type: 'error',
      message: 'Invalid request body.',
    })
  }

  const organization = await prisma.organization.findUnique({
    where: {
      id: auth.organization.id,
    },
    include: {
      private: true,
    },
  })

  if (!organization) {
    // This should never happen
    logger.error('Notify: Organization not found', {
      organizationId: auth.organization.id,
    })
    return sendResponse(403, {
      type: 'error',
      message: 'Invalid API key provided.',
    })
  }

  let transaction: NotificationTransaction | undefined
  if (inputs.transactionId) {
    const foundTransaction = await prisma.transaction.findUnique({
      where: {
        id: inputs.transactionId,
      },
      include: {
        hostInstance: {
          include: { apiKey: true },
        },
        action: {
          include: { organization: { include: { private: true } } },
        },
        owner: true,
      },
    })

    if (!foundTransaction) {
      logger.warn(
        'Notify: Transaction not found for notify call with transactionId',
        { transactionId: inputs.transactionId }
      )
      return sendResponse(403, {
        type: 'error',
        message: 'Transaction not found.',
      })
    }

    if (foundTransaction.action.organizationId !== auth.organization.id) {
      logger.warn('Notify: Transaction does not belong to organization', {
        transactionId: inputs.transactionId,
        organizationId: organization.id,
      })
      return sendResponse(403, {
        type: 'error',
        message: 'Transaction not found.',
      })
    }

    transaction = foundTransaction
  }

  await notify({
    transaction,
    message: inputs.message,
    title: inputs.title,
    environment: auth.apiKey.usageEnvironment,
    organization,
    deliveryInstructions: inputs.deliveryInstructions,
    createdAt: inputs.createdAt,
    idempotencyKey: inputs.idempotencyKey,
  })

  sendResponse(200, {
    type: 'success',
  })
})

export default router
