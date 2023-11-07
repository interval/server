import type { Request, Response } from 'express'
import env from 'env'
import { workos, isWorkOSEnabled, REDIRECT_URI } from '.'
import { logger } from '~/server/utils/logger'

export default async function auth(req: Request, res: Response) {
  if (!isWorkOSEnabled || !workos || !env.WORKOS_CLIENT_ID) {
    logger.error('WorkOS credentials not found, aborting', {
      path: req.path,
    })
    return res.sendStatus(501)
  }

  const { workosOrganizationId, transactionId } = req.query

  if (!workosOrganizationId || typeof workosOrganizationId !== 'string') {
    res.status(400).end()
    return
  }

  const authorizationURL = workos.sso.getAuthorizationURL({
    redirectURI: REDIRECT_URI,
    clientID: env.WORKOS_CLIENT_ID,
    organization: workosOrganizationId,
    state: transactionId
      ? JSON.stringify({ transactionId: String(transactionId) })
      : undefined,
  })

  res.redirect(authorizationURL)
  return
}
