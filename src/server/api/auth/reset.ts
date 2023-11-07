import type { Request, Response } from 'express'
import { unsealData } from 'iron-session'
import prisma from '~/server/prisma'
import { ironSessionOptions, encryptPassword } from '~/server/auth'
import { logger } from '~/server/utils/logger'

export default async function resetPasswordRoute(req: Request, res: Response) {
  const { seal, password, passwordConfirm } = req.body

  try {
    if (
      !seal ||
      !password ||
      !passwordConfirm ||
      password !== passwordConfirm
    ) {
      throw new PasswordResetError('Invalid input')
    }

    const unsealed = await unsealData<{ resetTokenId: string }>(seal, {
      password: ironSessionOptions.password,
    })

    const resetToken = await prisma.userPasswordResetToken.delete({
      where: {
        id: unsealed.resetTokenId,
      },
    })

    if (resetToken.expiresAt < new Date()) {
      throw new PasswordResetError('Reset token expired', 403)
    }

    const user = await prisma.user.update({
      where: {
        id: resetToken.userId,
      },
      data: {
        password: encryptPassword(password),
      },
      select: {
        id: true,
        lastName: true,
        firstName: true,
        email: true,
        mfaId: true,
      },
    })

    // Log user out of all existing sessions
    await prisma.userSession.deleteMany({
      where: {
        userId: resetToken.userId,
      },
    })

    const session = await prisma.userSession.create({
      data: {
        user: {
          connect: {
            id: user.id,
          },
        },
      },
    })

    req.session.user = user
    req.session.session = session
    req.session.currentOrganizationId = undefined
    await req.session.save()
    res.status(200).send(true)
  } catch (err) {
    logger.error('Failed to reset password', { error: err })
    if (err instanceof PasswordResetError) {
      res.status(err.code).send(err.message)
    } else {
      res.status(400).send(false)
    }
  }
}

class PasswordResetError extends Error {
  message: string
  code = 400

  constructor(message: string, code?: number) {
    super(message)
    this.message = message

    if (code) {
      this.code = code
    }
  }
}
