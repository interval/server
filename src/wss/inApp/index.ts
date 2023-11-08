/**
 * Internal actions that need access to the live app server
 * (for manipulating memory, etc.)
 */
import Interval, { Page, Layout } from '@interval/sdk-latest'
import env from '~/env'
import prisma from '~/server/prisma'
import { getName } from '~/utils/actions'
import { actionScheduleToDescriptiveString } from '~/utils/actionSchedule'
import requireParam from '~/server/internal/helpers/requireParam'
import { rescheduleAll, syncActionSchedules } from '../actionSchedule'
import dump_wss_state from './wss_state'

let endpoint = env.INTERNAL_TOOLS_ENDPOINT
if (!endpoint) {
  const u = new URL(env.APP_URL)
  u.protocol = u.protocol.replace('http', 'ws')
  u.pathname = '/websocket'
  endpoint = u.toString()
}

if (env.INTERNAL_TOOLS_API_KEY) {
  const interval = new Interval({
    apiKey: env.INTERNAL_TOOLS_API_KEY,
    endpoint,
    routes: {
      dump_wss_state,
      scheduled_actions: new Page({
        name: 'Scheduled actions',
        handler: async io => {
          const schedules = await prisma.actionSchedule.findMany({
            where: {
              deletedAt: null,
            },
            include: {
              action: {
                include: {
                  organization: true,
                },
              },
              runner: true,
              _count: {
                select: {
                  runs: true,
                },
              },
            },
          })

          return new Layout({
            menuItems: [
              {
                label: 'Reschedule all',
                route: 'scheduled_actions/reschedule_all',
              },
            ],
            children: [
              io.table('', {
                data: schedules,
                columns: [
                  'id',
                  {
                    label: 'Action',
                    renderCell: row => getName(row.action),
                  },
                  {
                    label: 'Runner',
                    renderCell: row => row.runner?.email ?? 'N/A',
                  },
                  {
                    label: 'Organization',
                    renderCell: row => ({
                      label: row.action.organization.name,
                    }),
                  },
                  {
                    label: 'Runs',
                    renderCell: row => row._count.runs,
                  },
                  {
                    label: 'Schedule',
                    renderCell: row => actionScheduleToDescriptiveString(row),
                  },
                  'createdAt',
                  'updatedAt',
                  'notifyOnSuccess',
                ],
                rowMenuItems: row => [
                  {
                    label: 'Delete',
                    route: 'scheduled_actions/delete',
                    params: { id: row.id },
                    theme: 'danger',
                    disabled: row.deletedAt !== null,
                  },
                ],
              }),
            ],
          })
        },
        routes: {
          delete: {
            name: 'Delete scheduled action',
            unlisted: true,
            handler: async io => {
              const id = requireParam('id')

              const schedule = await prisma.actionSchedule.findUnique({
                where: { id },
                include: {
                  action: {
                    include: {
                      metadata: true,
                      schedules: true,
                      organization: true,
                    },
                  },
                },
              })

              if (!schedule) {
                throw new Error('Schedule not found')
              }

              console.log('schedules', schedule.action.schedules)

              const shouldContinue = await io.confirm(
                `Are you sure you want to delete this schedule?`,
                {
                  helpText: `The schedule for action '${getName(
                    schedule.action
                  )}' will be deleted and any previously scheduled runs will be canceled.`,
                }
              )

              if (!shouldContinue) {
                throw new Error('Did not continue')
              }

              await syncActionSchedules(schedule.action, [])
            },
          },
          reschedule_all: {
            name: 'Reschedule all',
            description:
              'Recreates the cron schedule from the scheduled actions currently in the database.',
            unlisted: true,
            handler: async io => {
              const confirmed = await io.confirm(
                'Are you sure you want to reschedule all actions?',
                {
                  helpText:
                    "There's a small chance this may cause runs to be skipped if done the instant they should be running. Avoid doing this at the top or middle of any hour.",
                }
              )

              if (!confirmed) return

              const { stopped, started } = await rescheduleAll()

              return { stopped, started }
            },
          },
        },
      }),
    },
  })

  interval.listen().catch(err => {
    // Hopefully never ever happens
    console.error('Internal tools listener threw error', err)
  })
}
