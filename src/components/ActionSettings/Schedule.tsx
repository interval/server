import { Formik, Form } from 'formik'
import { useEffect, useMemo, useCallback } from 'react'
import classNames from 'classnames'
import { useFormikContext } from 'formik'
import { Link, Navigate } from 'react-router-dom'
import { DateTime } from 'luxon'
import IconClose from '~/icons/compiled/Close'
import IVButton from '~/components/IVButton'
import IVInputField from '~/components/IVInputField'
import IVSelect from '~/components/IVSelect'
import {
  trpc,
  client,
  inferMutationInput,
  inferQueryOutput,
} from '~/utils/trpc'
import AsyncIVSelect from '~/components/IVSelect/async'
import { SchedulePeriod, toScheduleInput } from '~/utils/actionSchedule'
import relativeTime, {
  DAY_NAMES,
  DAYS_OF_MONTH,
  displayStringToTime,
  timeToDisplayString,
  numberWithOrdinal,
} from '~/utils/date'
import { TIMEZONE_OPTIONS } from '~/utils/timezones'
import IVAlert from '~/components/IVAlert'
import IVCheckbox from '~/components/IVCheckbox'
import IconInfo from '~/icons/compiled/Info'
import { displayName } from '~/utils/user'
import { isBackgroundable } from '~/utils/actions'
import { useOrgParams } from '~/utils/organization'
import { useIsFeatureEnabled } from '~/utils/useIsFeatureEnabled'

const times = [
  '12:00 AM',
  '12:30 AM',
  '1:00 AM',
  '1:30 AM',
  '2:00 AM',
  '2:30 AM',
  '3:00 AM',
  '3:30 AM',
  '4:00 AM',
  '4:30 AM',
  '5:00 AM',
  '5:30 AM',
  '6:00 AM',
  '6:30 AM',
  '7:00 AM',
  '7:30 AM',
  '8:00 AM',
  '8:30 AM',
  '9:00 AM',
  '9:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '12:30 PM',
  '1:00 PM',
  '1:30 PM',
  '2:00 PM',
  '2:30 PM',
  '3:00 PM',
  '3:30 PM',
  '4:00 PM',
  '4:30 PM',
  '5:00 PM',
  '5:30 PM',
  '6:00 PM',
  '6:30 PM',
  '7:00 PM',
  '7:30 PM',
  '8:00 PM',
  '8:30 PM',
  '9:00 PM',
  '9:30 PM',
  '10:00 PM',
  '10:30 PM',
  '11:00 PM',
  '11:30 PM',
]

function usersToSelect(users: inferQueryOutput<'organization.users'>) {
  return (
    users?.map(({ user }) => {
      const name = [user.firstName, user.lastName].join(' ')
      return {
        value: user.id,
        label: name || user.email,
      }
    }) ?? []
  )
}

function ActionSchedule({
  action,
}: {
  action: inferQueryOutput<'action.one'>
}) {
  const { orgEnvSlug } = useOrgParams()
  const { values, setFieldValue } =
    useFormikContext<inferMutationInput<'action.schedule.update'>['data']>()

  const actionScheduleInput = values.actionScheduleInputs?.[0]
  const actionScheduleTransactions = useMemo(
    () =>
      action.transactions
        .filter(t => t.actionScheduleId === actionScheduleInput?.id)
        .sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf()),
    [actionScheduleInput?.id, action.transactions]
  )

  const time = useMemo(() => {
    const { hours, minutes } = actionScheduleInput ?? {}

    if (hours === undefined) {
      return '8:00 AM'
    }

    return timeToDisplayString(hours, minutes)
  }, [actionScheduleInput])

  const input = useMemo(() => {
    return {
      schedulePeriod: actionScheduleInput?.schedulePeriod ?? 'hour',
      timeZoneName:
        actionScheduleInput?.timeZoneName ?? DateTime.now().zoneName,
      dayOfWeek: actionScheduleInput?.dayOfWeek ?? 0,
      dayOfMonth: actionScheduleInput?.dayOfMonth ?? 1,
      hours: actionScheduleInput?.hours ?? 8,
      minutes: actionScheduleInput?.minutes ?? 0,
      runnerId: actionScheduleInput?.runnerId ?? undefined,
      runnerName: actionScheduleInput?.['runnerName'] ?? undefined,
      notifyOnSuccess: actionScheduleInput?.notifyOnSuccess ?? false,
    }
  }, [actionScheduleInput])

  const updateInput = useCallback(
    (updates: Partial<typeof input> = {}) => {
      setFieldValue('actionScheduleInputs', [{ ...input, ...updates }])
    },
    [input, setFieldValue]
  )

  // Update form values on refetch
  useEffect(() => {
    setFieldValue(
      'actionScheduleInputs',
      action.schedules.map(s => ({
        id: s.id,
        runnerName: s.runner ? displayName(s.runner) : null,
        ...toScheduleInput(s),
      }))
    )
  }, [setFieldValue, action.schedules])

  const handleUserSearch = useCallback(async (searchQuery: string) => {
    const accesses = await client.query('organization.users', {
      searchQuery,
      limit: 50,
    })

    return usersToSelect(accesses)
  }, [])

  return (
    <div>
      {actionScheduleInput ? (
        <div className="text-sm space-y-4">
          <IVInputField id="period" label="Run this action:">
            <div className="grid grid-cols-1 md:flex items-center justify-start">
              <IVSelect
                className="md:w-[140px]"
                onChange={e =>
                  updateInput({
                    schedulePeriod: e.target.value as SchedulePeriod,
                  })
                }
                value={input.schedulePeriod}
                options={[
                  {
                    label: 'Every hour',
                    value: 'hour',
                  },
                  {
                    label: 'Every day',
                    value: 'day',
                  },
                  {
                    label: 'Every week',
                    value: 'week',
                  },
                  {
                    label: 'Every month',
                    value: 'month',
                  },
                ]}
              />
              {input.schedulePeriod === 'week' && (
                <>
                  <div className="py-2 md:px-2">on</div>
                  <IVSelect
                    className="md:w-[140px]"
                    options={DAY_NAMES.map((day, i) => ({
                      label: day,
                      value: i.toString(),
                    }))}
                    value={input.dayOfWeek}
                    onChange={event => {
                      updateInput({ dayOfWeek: Number(event.target.value) })
                    }}
                  />
                </>
              )}
              {input.schedulePeriod === 'month' && (
                <>
                  <div className="py-2 md:px-2">on the</div>
                  <IVSelect
                    className="md:w-[90px]"
                    options={DAYS_OF_MONTH.map(day => ({
                      label: numberWithOrdinal(day),
                      value: String(day),
                    }))}
                    value={input.dayOfMonth}
                    onChange={event => {
                      updateInput({ dayOfMonth: Number(event.target.value) })
                    }}
                  />
                </>
              )}
              {input.schedulePeriod !== 'hour' && (
                <>
                  <div className="py-2 md:px-2">at</div>
                  <IVSelect
                    className="md:w-[130px]"
                    options={times.map(time => ({ label: time, value: time }))}
                    value={time}
                    onChange={event => {
                      const { hours, minutes } = displayStringToTime(
                        event.target.value
                      )
                      updateInput({ hours, minutes })
                    }}
                  />
                  <IVSelect
                    className="mt-2 md:mt-0 md:ml-2 md:w-[250px]"
                    options={TIMEZONE_OPTIONS}
                    value={input.timeZoneName}
                    onChange={event => {
                      updateInput({ timeZoneName: event.target.value })
                    }}
                  />
                </>
              )}
              <button
                onClick={() => setFieldValue('actionScheduleInputs', [])}
                className={classNames(
                  'hidden md:block text-[13px] text-gray-400 hover:text-red-600 ml-4'
                )}
              >
                <IconClose className="w-3 h-3" />
              </button>
              <button
                onClick={() => setFieldValue('actionScheduleInputs', [])}
                className={classNames(
                  'md:hidden py-2 w-[140px] text-left mt-2'
                )}
              >
                Remove schedule
              </button>
            </div>
          </IVInputField>

          <div className="max-w-xs">
            <IVInputField id="runnerId" label="Action runner">
              <AsyncIVSelect
                name="runnerId"
                defaultOptions
                defaultLabel="Organization owner"
                defaultValue={
                  input.runnerId
                    ? {
                        label: input.runnerName ?? input.runnerId,
                        value: input.runnerId,
                      }
                    : undefined
                }
                onSearch={handleUserSearch}
                onChange={runnerId => {
                  updateInput({ runnerId })
                }}
                isClearable
              />
            </IVInputField>
          </div>

          <div>
            <IVCheckbox
              id="notifyOnSuccess"
              label="Notify on successful runs"
              constraints={
                <>
                  <p>
                    If enabled, will notify the action runner when the action
                    completes successfully.
                  </p>
                  <p className="mt-2">
                    The runner will always be notified when the action is
                    unsuccessful or if it requires input.
                  </p>
                </>
              }
              checked={input.notifyOnSuccess}
              onChange={e => {
                updateInput({ notifyOnSuccess: e.target.checked })
              }}
            />
          </div>

          {actionScheduleTransactions.length > 0 && (
            <div>
              <strong>Last run: </strong>
              {relativeTime(actionScheduleTransactions[0].createdAt, {
                fullDateThresholdInHours: 24,
              })}
              <Link
                to={`/dashboard/${orgEnvSlug}/transactions?slug=${action.slug}`}
                className="font-medium ml-2 text-primary-500 hover:opacity-70"
              >
                View history &rsaquo;
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="mb-4">
            Add a schedule to run this action automatically.
          </p>

          <IVButton
            theme="secondary"
            label="Add schedule"
            onClick={() => {
              updateInput()
            }}
          />
        </div>
      )}
    </div>
  )
}

export default function ActionScheduleSettings({
  action,
  onSuccess,
  onError,
}: {
  action: inferQueryOutput<'action.one'>
  onSuccess: () => void
  onError: () => void
  refetch: () => void
}) {
  const { orgSlug } = useOrgParams()
  const updateMeta = trpc.useMutation('action.schedule.update')

  const actionScheduleInputs = useMemo(
    () =>
      action.schedules.map(s => ({
        id: s.id,
        runnerName: s.runner ? displayName(s.runner) : undefined,
        ...toScheduleInput(s),
      })),
    [action.schedules]
  )

  if (!isBackgroundable(action)) {
    return (
      <div className="flex">
        <IVAlert theme="warning" icon={IconInfo} className="mb-4">
          <p>
            Please enable <strong>Allow running in background</strong> in
            General settings before adding a schedule.
          </p>
        </IVAlert>
      </div>
    )
  }

  return (
    <Formik<inferMutationInput<'action.schedule.update'>['data']>
      initialValues={{
        actionScheduleInputs,
      }}
      validateOnBlur={false}
      validateOnChange={false}
      onSubmit={async data => {
        if (updateMeta.isLoading) return

        updateMeta.mutate(
          {
            actionId: action.id,
            data,
          },
          { onSuccess, onError }
        )
      }}
    >
      {({ isValid }) => (
        <Form>
          <ActionSchedule action={action} />
          <div className="mt-12">
            <IVButton
              loading={updateMeta.isLoading}
              disabled={!isValid}
              type="submit"
              label="Save changes"
            />
          </div>
        </Form>
      )}
    </Formik>
  )
}
