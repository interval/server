import type { Request, Response } from 'express'
import { tryLogin, requiredIdentityConfirmation } from '~/server/auth'
import prisma from '~/server/prisma'
import { logger } from '~/server/utils/logger'

export default async function loginRoute(req: Request, res: Response) {
  const { email, password, transactionId } = req.body

  if (!email || !password || Array.isArray(email) || Array.isArray(password)) {
    res.status(400).send(false)
    return
  }

  try {
    const { user, session } = await tryLogin(email, password)

    req.session.user = user
    req.session.session = session
    await req.session.save()

    if (user) {
      const fullUser = await prisma.user.findUnique({
        where: { email: user.email },
      })

      const requiredConfirmation = fullUser
        ? await requiredIdentityConfirmation(fullUser)
        : null
      if (requiredConfirmation === 'PASSWORD') {
        try {
          const now = new Date()
          await prisma.userSession.update({
            where: { id: session.id },
            data: { identityConfirmedAt: now },
          })
          if (transactionId) {
            await prisma.transactionRequirement.updateMany({
              where: { transactionId, type: 'IDENTITY_CONFIRM' },
              data: { satisfiedAt: now },
            })
          }
        } catch (err) {
          logger.error('Login: Unable to confirm identity', { error: err })
        }
      }
    }

    res.status(200).send(true)
  } catch (err) {
    res.status(401).send(false)
  }
}
