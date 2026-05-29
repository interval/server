import { Cron } from 'croner'
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
  return makeApiCall(
    '/api/action-schedules/sync',
    JSON.stringify({
      actionId: action.id,
      inputs,
    })
  )
}
