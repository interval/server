import * as cron from 'node-cron'
import { ActionSchedule } from '@prisma/client'
import {
  CronSchedule,
  cronScheduleToString,
  toCronSchedule,
  ScheduleInput,
} from '~/utils/actionSchedule'
import { ActionWithPossibleMetadata } from '~/utils/types'
import { makeApiCall } from './wss'

export function isInputValid(input: ScheduleInput): boolean {
  const schedule = toCronSchedule(input)
  if (!schedule) return false

  return cron.validate(cronScheduleToString(schedule))
}

export function isValid(schedule: CronSchedule): boolean {
  return cron.validate(cronScheduleToString(schedule))
}

export async function syncActionSchedules(
  action: ActionWithPossibleMetadata & { schedules?: ActionSchedule[] },
  inputs: ScheduleInput[]
) {
  return makeApiCall(
    '/api/action-schedules/sync',
    JSON.stringify({
      actionId: action.id,
      inputs,
    })
  )
}
