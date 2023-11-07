import express from 'express'
import { z } from 'zod'
import { DECLARE_HOST } from '@interval/sdk/dist/internalRpcSchema'
import { loginWithApiKey } from '../auth'
import prisma from '../prisma'
import { getPermissionsWarning, initializeActions } from '../utils/actions'
import { isSlugValid } from '~/utils/validate'
import { getSdkAlert } from '../utils/sdkAlerts'
import { isFlagEnabled } from '../utils/featureFlags'
import { logger } from '~/server/utils/logger'

const router = express.Router()

router.post('/declare', async (req, res) => {
  function sendResponse(
    statusCode: number,
    returns: z.input<(typeof DECLARE_HOST)['returns']>
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

  // Only production actions supported for HTTP Hosts
  if (!auth || auth.apiKey.usageEnvironment !== 'PRODUCTION') {
    return sendResponse(403, {
      type: 'error',
      message: 'Invalid API key provided.',
    })
  }

  let inputs: z.infer<(typeof DECLARE_HOST)['inputs']>
  try {
    inputs = DECLARE_HOST.inputs.parse(req.body)
  } catch (err) {
    return sendResponse(400, {
      type: 'error',
      message: 'Invalid request body.',
    })
  }

  const { httpHostId, actions, groups, sdkName, sdkVersion } = inputs

  let httpHost = await prisma.httpHost.findUnique({
    where: {
      id: httpHostId,
    },
    include: {
      actions: true,
      actionGroups: true,
    },
  })

  if (!httpHost || httpHost.organizationId !== auth.organization.id) {
    return sendResponse(404, {
      type: 'error',
      message: 'Host not found.',
    })
  }

  httpHost = await prisma.httpHost.update({
    where: {
      id: httpHost.id,
    },
    data: {
      sdkName,
      sdkVersion,
      lastConnectedAt: new Date(),
      // Disconnect existing actions, will reconnect in initializeActions below
      actions: {
        disconnect: httpHost.actions.map(action => ({ id: action.id })),
      },
      actionGroups: {
        disconnect: httpHost.actionGroups.map(group => ({ id: group.id })),
      },
    },
    include: {
      actions: true,
      actionGroups: true,
    },
  })

  const slugs = actions.map(({ slug }) => slug)
  const invalidSlugs = slugs.filter(slug => !isSlugValid(slug))

  initializeActions({
    hostInstance: null,
    httpHost,
    actions,
    groups,
    developerId: null,
    organizationEnvironmentId: auth.apiKey.organizationEnvironmentId,
    sdkVersion,
    sdkName,
  }).catch(error => {
    logger.error('Failed initializing actions', {
      organizationEnvironmentId: auth?.apiKey?.organizationEnvironmentId,
      organizationId: auth?.organization?.id,
      userId: auth?.user?.id,
      error,
    })
  })

  const sdkAlert = await getSdkAlert(sdkName, sdkVersion)

  const warnings: string[] = []

  const permissionsWarning = await getPermissionsWarning({
    actions,
    groups,
    organizationId: auth.apiKey.organizationId,
  })

  if (permissionsWarning) warnings.push(permissionsWarning)

  sendResponse(200, {
    type: 'success',
    invalidSlugs,
    sdkAlert,
    warnings,
  })
})

export default router
