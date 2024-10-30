import express, { Request, Response, NextFunction } from 'express'
import env from '~/env'
import { z } from 'zod'
import { logger } from '~/server/utils/logger'
import prisma from '~/server/prisma'
import { sendNotificationToConnectedClient } from './notify'
import { startTransaction, cancelTransaction } from './transactions'
import { Prisma } from '@prisma/client'
import { serializableRecord } from '@interval/sdk/dist/ioSchema'
import { port } from './consts'
import requestLogger from '~/server/middleware/requestLogger'
import { encryptPassword } from '~/server/auth'
import { syncActionSchedules } from './actionSchedule'
import { ALL_TIMEZONES } from '~/utils/timezones'

const app = express()
app.use(requestLogger)

// Very basic authentication layer that uses a shared secret
function authMiddleware(req: Request, res: Response, next?: NextFunction) {
  const header = req.header('Authorization')
  const token = header?.split(' ')[1]
  if (token === encryptPassword(env.WSS_API_SECRET)) {
    next?.()
    return
  }

  res.status(401)
  res.end()
}

app.use(authMiddleware)

app.use(express.json())

const notifyBody = z.object({
  transactionId: z.string(),
  notificationId: z.string(),
})

app.post('/api/notify', async (req: Request, res: Response) => {
  try {
    const parsed = notifyBody.parse(req.body)

    const [transaction, notification] = await prisma.$transaction([
      prisma.transaction.findUniqueOrThrow({
        where: {
          id: parsed.transactionId,
        },
      }),
      prisma.notification.findUniqueOrThrow({
        where: {
          id: parsed.notificationId,
        },
        include: {
          notificationDeliveries: true,
        },
      }),
    ])

    await sendNotificationToConnectedClient(transaction, notification)
    return res.sendStatus(200)
  } catch (err) {
    logger.error('Error in WSS /api/notify', {
      error: err,
      body: req.body,
    })
    res.status(
      err instanceof z.ZodError
        ? 400
        : err instanceof Prisma.PrismaClientKnownRequestError
        ? 404
        : 500
    )
    res.end()
  }
})

const startBody = z.object({
  transactionId: z.string(),
  runnerId: z.string(),
  clientId: z.string(),
  params: serializableRecord,
  paramsMeta: z.any(),
})

app.post('/api/transactions/start', async (req: Request, res: Response) => {
  try {
    const parsed = startBody.parse(req.body)

    const [transaction, runner] = await prisma.$transaction([
      prisma.transaction.findUniqueOrThrow({
        where: {
          id: parsed.transactionId,
        },
        include: {
          action: true,
        },
      }),
      prisma.user.findUniqueOrThrow({
        where: {
          id: parsed.runnerId,
        },
        include: {
          userOrganizationAccess: {
            select: {
              permissions: true,
              groupMemberships: {
                select: {
                  group: {
                    select: {
                      id: true,
                      slug: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ])

    await startTransaction(transaction, runner, {
      ...parsed,
    })
    res.sendStatus(200)
  } catch (err) {
    logger.error('Error in WSS /api/transactions/start', {
      error: err,
      body: req.body,
    })

    res.status(
      err instanceof z.ZodError
        ? 400
        : err instanceof Prisma.PrismaClientKnownRequestError
        ? 404
        : 500
    )
    res.end()
  }
})

const cancelBody = z.object({
  transactionId: z.string(),
})

app.post('/api/transactions/cancel', async (req: Request, res: Response) => {
  try {
    const parsed = cancelBody.parse(req.body)

    const transaction = await prisma.transaction.findUniqueOrThrow({
      where: {
        id: parsed.transactionId,
      },
    })

    await cancelTransaction(transaction)
    return res.sendStatus(200)
  } catch (err) {
    logger.error('Error in WSS /api/transactions/cancel', {
      error: err,
      body: req.body,
    })

    res.status(
      err instanceof z.ZodError
        ? 400
        : err instanceof Prisma.PrismaClientKnownRequestError
        ? 404
        : 500
    )
    res.end()
  }
})

const syncScheduleBody = z.object({
  actionId: z.string(),
  inputs: z.array(
    z.object({
      schedulePeriod: z.enum(['hour', 'day', 'week', 'month']),
      timeZoneName: z.enum(ALL_TIMEZONES).optional(),
      hours: z.number().optional(),
      minutes: z.number().optional(),
      dayOfWeek: z.number().optional(),
      dayOfMonth: z.number().optional(),
      runnerId: z.string().optional().nullable(),
      notifyOnSuccess: z.boolean().optional(),
    })
  ),
})

app.post('/api/action-schedules/sync', async (req: Request, res: Response) => {
  try {
    const parsed = syncScheduleBody.parse(req.body)

    logger.debug('/api/action-schedules/sync', {
      parsed,
    })

    const action = await prisma.action.findUniqueOrThrow({
      where: {
        id: parsed.actionId,
      },
      include: {
        schedules: {
          where: {
            deletedAt: null,
          },
        },
      },
    })

    await syncActionSchedules(action, parsed.inputs)
    return res.sendStatus(200)
  } catch (err) {
    logger.error('Error in WSS /api/action-schedules/sync', {
      error: err,
      body: req.body,
    })

    res.status(
      err instanceof z.ZodError
        ? 400
        : err instanceof Prisma.PrismaClientKnownRequestError
        ? 404
        : 500
    )
    res.end()
  }
})

app.listen(port)
