import { useMemo, useEffect } from 'react'
import { Formik, Form, Field, useFormikContext } from 'formik'
import { ActionAccessLevel } from '@prisma/client'
import { actionAccessLevelToString, pluralizeWithCount } from '~/utils/text'
import { inferQueryOutput, inferMutationInput, trpc } from '~/utils/trpc'
import IVButton from '~/components/IVButton'
import IVInputField from '~/components/IVInputField'
import IVRadio from '~/components/IVRadio'
import IVSelect from '~/components/IVSelect'
import { useOrgParams } from '~/utils/organization'
import IVConstraintsIndicator from '~/components/IVConstraintsIndicator'
import { useIsFeatureEnabled } from '~/utils/useIsFeatureEnabled'
import useDashboard from '../DashboardContext'
import { Link } from 'react-router-dom'
import { SDK_PERMISSIONS_MIN_VERSION } from '~/utils/permissions'
import IVAlert from '../IVAlert'
import IconInfo from '~/icons/compiled/Info'

function GroupAccessForm({
  groups,
  groupPermissions,
}: {
  groups: inferQueryOutput<'group.list'>
  groupPermissions: { groupId: string; level: ActionAccessLevel }[]
}) {
  const { orgEnvSlug } = useOrgParams()

  const { setFieldValue, values } =
    useFormikContext<inferMutationInput<'action.permissions.update'>['data']>()

  useEffect(() => {
    setFieldValue('groupPermissions', groupPermissions)
  }, [setFieldValue, groupPermissions])

  if (!groups) return null

  return (
    <section className="ml-7 max-w-lg">
      <div className="">
        {groups.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {groups.map(group => {
              const formValue = values.groupPermissions?.find(
                v => v.groupId === group.id
              )

              return (
                <li
                  key={group.id}
                  className="flex gap-8 items-center justify-between"
                >
                  <div className="flex-1">
                    <span className="font-medium text-sm text-gray-700 block">
                      {group.name}
                    </span>
                    <span className="block text-xs text-gray-400">
                      {pluralizeWithCount(group._count.memberships, 'member')}
                    </span>
                  </div>
                  <div className="flex">
                    <IVInputField id="level" label="">
                      <IVSelect
                        id="level"
                        name="level"
                        className="inline-block w-auto"
                        value={formValue?.level ?? 'NONE'}
                        defaultLabel="No access"
                        options={Object.values(ActionAccessLevel).map(
                          level => ({
                            value: level,
                            label: actionAccessLevelToString(level),
                          })
                        )}
                        onChange={event => {
                          const { groupPermissions } = values
                          if (!groupPermissions) return

                          const idx = groupPermissions.findIndex(
                            v => v.groupId === group.id
                          )
                          if (idx < 0) return

                          const level = event.target.value as ActionAccessLevel

                          groupPermissions[idx].level = level || 'NONE'

                          setFieldValue('groupPermissions', groupPermissions)
                        }}
                      />
                    </IVInputField>
                    <div className="flex w-5">
                      {formValue?.level === 'RUNNER' && (
                        <span className="pl-2">
                          <IVConstraintsIndicator
                            constraints={
                              <>
                                To run the action, users on this team must also
                                have{' '}
                                <a
                                  className="text-primary-500 font-medium hover:opacity-60"
                                  href="https://interval.com/docs/writing-actions/authentication#roles"
                                  target="_blank"
                                >
                                  a role with sufficient access
                                </a>
                                .
                              </>
                            }
                            id="admin-explanation"
                            placement="right"
                          />
                        </span>
                      )}
                      {formValue?.level === 'ADMINISTRATOR' && (
                        <span className="pl-2">
                          <IVConstraintsIndicator
                            constraints={
                              <>
                                <p>
                                  The Administrator permission enables running
                                  the action and configuring settings.
                                </p>
                                <p className="mt-1">
                                  To run the action, users on this team must
                                  also have{' '}
                                  <a
                                    className="text-primary-500 font-medium hover:opacity-60"
                                    href="https://interval.com/docs/writing-actions/authentication#roles"
                                    target="_blank"
                                  >
                                    a role with sufficient access
                                  </a>
                                  .
                                  <p className="mt-1">
                                    To configure action settings, users on this
                                    team must also have the{' '}
                                    <a
                                      className="text-primary-500 font-medium hover:opacity-60"
                                      href="https://interval.com/docs/writing-actions/authentication#roles"
                                      target="_blank"
                                    >
                                      Admin role
                                    </a>
                                    .
                                  </p>
                                </p>
                              </>
                            }
                            id="admin-explanation"
                            placement="right"
                          />
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
            <li key="none" className="flex gap-8 items-center justify-between">
              <div className="flex-1">
                <span className="font-medium text-gray-700 text-sm block">
                  Everyone else
                </span>
              </div>
              <div className="flex">
                <span className="text-sm block py-2 pr-16">No access</span>
                <div className="flex w-5"></div>
              </div>
            </li>
          </ul>
        ) : (
          <div className="text-sm">
            <p>
              There aren't any teams yet. Please create one to configure team
              access.
            </p>

            <div className="mt-4">
              <IVButton
                theme="secondary"
                label="Configure teams"
                href={`/dashboard/${orgEnvSlug}/organization/teams`}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default function ActionPermissionsSettings({
  action,
  onSuccess,
  onError,
  isUsingCodeBasedPermissions,
}: {
  action: inferQueryOutput<'action.one'>
  onSuccess: () => void
  onError: () => void
  refetch: () => void
  isUsingCodeBasedPermissions?: boolean
}) {
  const { organization } = useDashboard()

  const groups = trpc.useQuery(['group.list', { actionId: action.id }], {
    refetchOnWindowFocus: false,
  })

  const updateMeta = trpc.useMutation('action.permissions.update')

  const groupPermissions = useMemo(
    () =>
      groups.data?.map(group => ({
        groupId: group.id,
        level: group.actionAccesses[0]?.level ?? ('NONE' as ActionAccessLevel),
      })),
    [groups.data]
  )

  if (!groups.data || !groupPermissions) {
    return null
  }

  if (isUsingCodeBasedPermissions) {
    return (
      <div className="flex">
        <IVAlert theme="info" icon={IconInfo} className="mb-4">
          <p>
            Starting with version <code>{SDK_PERMISSIONS_MIN_VERSION}</code> of
            the SDK, permissions must be configured via code.{' '}
            <a
              href="https://interval.com/docs/writing-actions/authentication#defining-permissions-in-code"
              className="text-primary-500 font-medium hover:opacity-60"
            >
              View documentation &rsaquo;
            </a>
          </p>
        </IVAlert>
      </div>
    )
  }

  return (
    <Formik<inferMutationInput<'action.permissions.update'>['data']>
      initialValues={{
        groupPermissions,
        availability: action.metadata?.availability ?? 'ORGANIZATION',
      }}
      validateOnBlur={false}
      validateOnChange={false}
      onSubmit={async data => {
        if (updateMeta.isLoading) return

        updateMeta.mutate(
          {
            actionId: action.id,
            data: {
              ...data,
              // before code-based permissions, this was the default behavior - organization = undefined.
              // this UI is not available for organizations using code-based permissions, so we'll
              // keep the previous behavior here.
              availability:
                data.availability === 'ORGANIZATION' ? null : data.availability,
            },
          },
          {
            onSuccess() {
              groups.refetch()
              onSuccess()
            },
            onError,
          }
        )
      }}
    >
      {({ values, isValid }) => (
        <Form>
          <div>
            <div className="space-y-2">
              <Field
                name="availability"
                id="availability-organization"
                as={IVRadio}
                value="ORGANIZATION"
                label="Organization"
                helpText="Visible to anyone in the organization."
                checked={values.availability === 'ORGANIZATION'}
              />
              <Field
                name="availability"
                id="availability-group"
                as={IVRadio}
                value="GROUPS"
                label="Teams"
                helpText="Visible only to teams explicitly granted access."
                checked={values.availability === 'GROUPS'}
              />
              {values.availability === 'GROUPS' && (
                <div className="pt-2">
                  <GroupAccessForm
                    groups={groups.data}
                    groupPermissions={groupPermissions}
                  />
                </div>
              )}
            </div>
          </div>
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
