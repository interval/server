import express from 'express'
import { z } from 'zod'
import {
  ENQUEUE_ACTION,
  DEQUEUE_ACTION,
} from '@interval/sdk/dist/internalRpcSchema'
import { serializeDates } from '@interval/sdk/dist/utils/deserialize'
import { User } from '@prisma/client'
import prisma from '../prisma'
import { loginWithApiKey } from '../auth'
import { getQueuedActionParams } from '~/utils/queuedActions'
import { logger } from '~/server/utils/logger'

const router = express.Router()

router.post('/enqueue', async (req, res) => {
  // To ensure correct return type
  function sendResponse(
    statusCode: number,
    returns: z.input<(typeof ENQUEUE_ACTION)['returns']>
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

  let inputs: z.infer<(typeof ENQUEUE_ACTION)['inputs']>
  try {
    inputs = ENQUEUE_ACTION.inputs.parse(req.body)
  } catch (err) {
    return sendResponse(400, {
      type: 'error',
      message: 'Invalid request body.',
    })
  }

  const action = await prisma.action.findFirst({
    where: {
      slug: inputs.slug,
      organizationId: auth.organization.id,
      developerId:
        auth.apiKey.usageEnvironment === 'DEVELOPMENT' ? auth.user.id : null,
      organizationEnvironmentId: auth.apiKey.organizationEnvironmentId,
    },
  })

  if (!action) {
    return sendResponse(404, {
      type: 'error',
      message: 'Action not found.',
    })
  }

  let assignee: User | null | undefined
  if (inputs.assignee) {
    // TODO: Handle other assignment types
    assignee = await prisma.user.findUnique({
      where: {
        email: inputs.assignee,
      },
    })

    if (!assignee) {
      return sendResponse(404, {
        type: 'error',
        message: 'Assignee not found',
      })
    }

    if (
      auth.apiKey.usageEnvironment === 'DEVELOPMENT' &&
      assignee.id !== action.developerId
    ) {
      return sendResponse(400, {
        type: 'error',
        message:
          'Development actions can only be assigned to the action developer',
      })
    }
  }

  const queuedAction = await prisma.queuedAction.create({
    data: {
      action: { connect: { id: action.id } },
      params: inputs.params ? serializeDates(inputs.params) : undefined,
      paramsMeta: inputs.paramsMeta || undefined,
      assignee: assignee ? { connect: { id: assignee.id } } : undefined,
    },
  })

  sendResponse(200, {
    type: 'success',
    id: queuedAction.id,
  })
})

router.post('/dequeue', async (req, res) => {
  // To ensure correct return type
  function sendResponse(
    statusCode: number,
    returns: z.input<(typeof DEQUEUE_ACTION)['returns']>
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

  let inputs: z.infer<(typeof DEQUEUE_ACTION)['inputs']>
  try {
    inputs = DEQUEUE_ACTION.inputs.parse(req.body)
  } catch (err) {
    return sendResponse(400, {
      type: 'error',
      message: 'Invalid request body.',
    })
  }

  const queuedAction = await prisma.queuedAction.findUnique({
    where: {
      id: inputs.id,
    },
    include: {
      action: true,
      assignee: true,
    },
  })

  if (
    !queuedAction ||
    queuedAction.action.organizationId !== auth.organization.id
  ) {
    return sendResponse(404, {
      type: 'error',
      message: 'Queued action not found',
    })
  }

  try {
    await prisma.queuedAction.delete({
      where: {
        id: queuedAction.id,
      },
    })
  } catch (error) {
    logger.error('Failed deleting queued action', {
      queuedActionId: queuedAction.id,
      error,
    })

    return sendResponse(500, {
      type: 'error',
      message: 'Server error',
    })
  }

  sendResponse(200, {
    type: 'success',
    id: queuedAction.id,
    assignee: queuedAction.assignee?.email,
    params: getQueuedActionParams(queuedAction.params),
    paramsMeta: queuedAction.paramsMeta,
  })
})

export default router
