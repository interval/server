import { Cron } from 'croner'
import { ActionSchedule, Prisma } from '@prisma/client'
import {
  CronSchedule,
  cronScheduleToString,
  toCronSchedule,
  ScheduleInput,
  cronSchedulesEqual,
} from '~/utils/actionSchedule'
import prisma from '~/server/prisma'
import {
  ActionScheduleWithAction,
  ActionWithPossibleMetadata,
} from '~/utils/types'
import notify from '~/server/utils/notify'
import { getName, isBackgroundable } from '~/utils/actions'
import { startTransaction } from '~/wss/transactions'
import { getCurrentHostInstance } from '~/server/utils/transactions'
import { logger } from '~/server/utils/logger'
import { TransactionRunner } from '~/utils/user'

/**
 * Currently assumes a single app server architecture, will have
 * to be refactored in order to support multiple app servers.
 */

const tasks = new Map<string, Cron>()

export function isInputValid(input: ScheduleInput): boolean {
  const schedule = toCronSchedule(input)
  if (!schedule) return false
  return isValid(schedule)
}

export function isValid(schedule: CronSchedule): boolean {
  try {
    Cron(cronScheduleToString(schedule), { maxRuns: 0 })
    return true
  } catch {
    return false
  }
}

export async function syncActionSchedules(
  action: ActionWithPossibleMetadata & { schedules?: ActionSchedule[] },
  inputs: ScheduleInput[]
) {
  logger.debug('syncActionSchedules', { action, inputs })
  const newSchedules = inputs
    .map(input => toCronSchedule(input))
    .filter(cs => !!cs) as CronSchedule[]

  const existingSchedules = action.schedules ?? []
  const actionIsBackgroundable = isBackgroundable(action)

  for (const existing of existingSchedules) {
    if (
      existing &&
      (!actionIsBackgroundable ||
        newSchedules.every(
          newSchedule => !cronSchedulesEqual(existing, newSchedule)
        ))
    ) {
      stop(existing.id)
      const run = await prisma.actionScheduleRun.findFirst({
        where: {
          actionScheduleId: existing.id,
        },
      })

      if (!run) {
        try {
          await prisma.actionSchedule.delete({
            where: {
              id: existing.id,
            },
          })
        } catch (err) {
          logger.error(
            'Failed actually deleting action schedule, will soft delete',
            { id: existing.id }
          )
        }
      }

      await prisma.actionSchedule.updateMany({
        where: {
          id: existing.id,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      })
    }
  }

  if (!actionIsBackgroundable) {
    logger.error('Action not backgroundable, not creating actionSchedules', {
      actionId: action.id,
    })
    return
  }

  const toCreate = newSchedules.filter(
    newSchedule =>
      existingSchedules.length === 0 ||
      existingSchedules.every(
        existing => !cronSchedulesEqual(existing, newSchedule)
      )
  )

  for (const { runnerId, ...newSchedule } of toCreate) {
    if (!isValid(newSchedule)) {
      const scheduleString = cronScheduleToString(newSchedule)
      logger.error('Invalid schedule, skipping', {
        newSchedule,
        scheduleString,
      })
      continue
    }

    const actionSchedule = await prisma.actionSchedule.create({
      data: {
        action: { connect: { id: action.id } },
        runner: runnerId ? { connect: { id: runnerId } } : undefined,
        ...newSchedule,
      },
      include: {
        action: true,
        runner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
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
        },
      },
    })

    schedule(actionSchedule)
  }
}

export async function scheduleAllExisting() {
  const actionSchedules = await prisma.actionSchedule.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      action: true,
      runner: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
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
      },
    },
  })

  for (const actionSchedule of actionSchedules) {
    try {
      schedule(actionSchedule)
    } catch (err) {
      logger.error('Failed scheduling action', {
        actionScheduleId: actionSchedule.id,
      })
    }
  }
}

export function schedule(
  actionSchedule: ActionScheduleWithAction & {
    runner: TransactionRunner | null
  }
) {
  if (tasks.has(actionSchedule.id)) {
    logger.info('Task already scheduled, doing nothing', {
      actionScheduleId: actionSchedule.id,
    })
    return
  }

  const task = Cron(
    cronScheduleToString(actionSchedule),
    {
      timezone: actionSchedule.timeZoneName,
    },
    async () => {
      try {
        const action = await prisma.action.findUnique({
          where: {
            id: actionSchedule.actionId,
          },
          include: {
            organization: {
              include: {
                private: true,
                owner: true,
              },
            },
            hostInstances: {
              include: {
                apiKey: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
            httpHosts: {
              orderBy: {
                createdAt: 'desc',
              },
            },
            metadata: true,
          },
        })

        if (!action) {
          // This should never happen
          logger.error('Action not found', {
            actionId: actionSchedule.actionId,
          })
          return
        }

        // Double check backgroundability here in case changed in code
        if (!isBackgroundable(action)) {
          logger.error(`Action not backgroundable, skipping scheduled action`, {
            actionScheduleId: actionSchedule.actionId,
          })
          return
        }

        const scheduleRunner =
          actionSchedule.runner ??
          (await prisma.user.findUnique({
            where: {
              id: action.organization.ownerId,
            },

            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
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
          }))

        if (!scheduleRunner) {
          // This should never happen

          logger.error('Could not find action runner', {
            actionScheduleId: actionSchedule.id,
          })

          await prisma.actionScheduleRun.create({
            data: {
              actionSchedule: { connect: { id: actionSchedule.id } },
              status: 'FAILURE',
              details: 'Could not find action runner',
            },
          })

          return
        }

        let hostInstance: Prisma.HostInstanceGetPayload<{
          include: {
            apiKey: true
          }
        }>
        try {
          const hostInstanceWithoutApiKey = await getCurrentHostInstance(action)
          const hostInstanceWithApiKey = await prisma.hostInstance.findUnique({
            where: {
              id: hostInstanceWithoutApiKey.id,
            },
            include: {
              apiKey: true,
            },
          })

          if (!hostInstanceWithApiKey) {
            // This should never happen
            throw new Error(
              `Failed retreiving API key for hostInstance ${hostInstanceWithoutApiKey.id}`
            )
          }

          hostInstance = hostInstanceWithApiKey
        } catch (err) {
          logger.error('Could not find HostInstance for scheduled action', {
            actionScheduleId: actionSchedule.id,
          })

          await prisma.actionScheduleRun.create({
            data: {
              actionSchedule: { connect: { id: actionSchedule.id } },
              status: 'FAILURE',
              details: 'Could not find HostInstance',
            },
          })

          return
        }

        const runner: TransactionRunner = scheduleRunner

        const notifyRunner = async (title: string, message: string) => {
          await notify({
            title: `${title} for ${getName(action)}`,
            message,
            environment: hostInstance.apiKey.usageEnvironment,
            organization: action.organization,
            deliveryInstructions: [{ to: runner.email }],
            createdAt: new Date().toISOString(),
          })
        }

        try {
          const transaction = await prisma.transaction.create({
            data: {
              status: 'RUNNING',
              action: { connect: { id: action.id } },
              actionSchedule: { connect: { id: actionSchedule.id } },
              hostInstance: {
                connect: { id: hostInstance.id },
              },
              owner: { connect: { id: runner.id } },
            },
            include: {
              action: true,
            },
          })

          try {
            await startTransaction(transaction, runner)

            await prisma.actionScheduleRun.create({
              data: {
                actionSchedule: { connect: { id: actionSchedule.id } },
                status: 'SUCCESS',
                transaction: { connect: { id: transaction.id } },
              },
            })
            return
          } catch (err) {
            logger.error('Failed starting scheduled action transaction', {
              actionScheduleId: actionSchedule.id,
            })
            await prisma.transaction.update({
              where: {
                id: transaction.id,
              },
              data: {
                status: 'HOST_CONNECTION_DROPPED',
              },
            })

            await prisma.actionScheduleRun.create({
              data: {
                actionSchedule: { connect: { id: actionSchedule.id } },
                status: 'FAILURE',
                details: 'Failed starting transaction',
                transaction: { connect: { id: transaction.id } },
              },
            })

            try {
              await notifyRunner(
                'Scheduled run failed',
                "We could not reach the action, are you sure the host is running? If this is intentional, please disable the action's schedule configuration."
              )
            } catch (err) {
              logger.error('Failed notifying action runner', {
                actionScheduleId: actionSchedule.id,
              })
            }

            return
          }
        } catch (err) {
          logger.error('Failed creating transaction for scheduled action', {
            actionScheduleId: actionSchedule.id,
          })
          await prisma.actionScheduleRun.create({
            data: {
              actionSchedule: { connect: { id: actionSchedule.id } },
              status: 'FAILURE',
              details: 'Failed creating transaction',
            },
          })
          return
        }
      } catch (err) {
        logger.error('Failed spawning ActionScheduleRun', {
          error: err,
          actionScheduleId: actionSchedule.id,
        })
      }
    },
  )

  tasks.set(actionSchedule.id, task)
}

export function stop(actionScheduleId: string) {
  const task = tasks.get(actionScheduleId)

  if (!task) {
    logger.error('Failed stopping action schedule, task not found', {
      actionScheduleId,
    })
    return
  }

  task.stop()

  tasks.delete(actionScheduleId)
}

export async function rescheduleAll() {
  const stopped = tasks.size

  for (const task of tasks.values()) {
    task.stop()
  }

  tasks.clear()

  await scheduleAllExisting()

  const started = tasks.size

  return { stopped, started }
}
