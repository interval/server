import type { Request, Response } from 'express'
import { AuthenticationError, validateSession } from '~/server/auth'
import { logger } from '~/server/utils/logger'

export default async function sessionRoute(req: Request, res: Response) {
  if (req.session.session) {
    try {
      const { user, session } = await validateSession(req.session.session.id)
      req.session.user = user
      req.session.session = session
      await req.session.save()
      res.status(200).end()
      return
    } catch (err) {
      if (err instanceof AuthenticationError) {
        switch (err.code) {
          case 'INVALID':
          case 'EXPIRED':
          case 'NOT_FOUND':
            logger.error('Invalid or expired session, clearing', {
              sessionId: req?.session?.session?.id,
              error: err,
            })
            req.session.destroy()
        }
        res.status(401).json({ code: err.code })
        return
      } else {
        logger.error('Invalid session', { error: err })
      }
    }
  }

  res.status(401).end()
}
