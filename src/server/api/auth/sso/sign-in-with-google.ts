import type { Request, Response } from 'express'
import env from 'env'
import { workos, isWorkOSEnabled, REDIRECT_URI } from '.'
import { logger } from '~/server/utils/logger'

export default async function signInWithGoogle(req: Request, res: Response) {
  if (!env.WORKOS_CLIENT_ID || !workos || !isWorkOSEnabled) {
    logger.error('WorkOS credentials not found, aborting', {
      path: req.path,
    })
    return res.sendStatus(501)
  }

  const { token, plan, transactionId } = req.query

  const state = {}
  if (token) {
    state['invitationId'] = String(token)
  }
  if (plan) {
    state['plan'] = String(plan)
  }
  if (transactionId) {
    state['transactionId'] = String(transactionId)
  }

  const authorizationURL = workos.sso.getAuthorizationURL({
    redirectURI: REDIRECT_URI,
    clientID: env.WORKOS_CLIENT_ID,
    provider: 'GoogleOAuth',
    state: Object.keys(state).length > 0 ? JSON.stringify(state) : undefined,
  })

  res.redirect(authorizationURL)
  return
}
