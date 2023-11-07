import { useState, useEffect } from 'react'
import { Field, Form, Formik } from 'formik'
import { DialogStateReturn } from 'reakit/ts'
import { trpc, inferMutationInput } from '~/utils/trpc'
import IVInputField from '~/components/IVInputField'
import IVButton from '~/components/IVButton'
import { notify } from '~/components/NotificationCenter'
import useDashboard, { useHasPermission } from '~/components/DashboardContext'
import { Link } from 'react-router-dom'
import IVSelect from '~/components/IVSelect'
import { EXPOSED_ROLES } from '~/utils/permissions'
import { userAccessPermissionToString } from '~/utils/text'
import IVAPIError from '~/components/IVAPIError'
import IVRadio from '~/components/IVRadio'
import { TIMEZONE_OPTIONS } from '~/utils/timezones'
import { useOrgParams } from '~/utils/organization'
import IVDialog, { useDialogState } from '~/components/IVDialog'
import EnrollMFAForm from './EnrollMFAForm'
import IVTooltip from '~/components/IVTooltip'
import MFAInput from '../MFAInput'

function UpdateAccountForm() {
  const mutation = trpc.useMutation('user.edit')
  const ctx = trpc.useContext()
  const { me, organization } = useDashboard()
  const canManageOrganization = useHasPermission('WRITE_ORG_SETTINGS')
  const [hasPendingEmailConf, setHasPendingEmailConf] = useState(false)

  return (
    <Formik<inferMutationInput<'user.edit'>['data']>
      initialValues={{
        firstName: me.firstName ?? '',
        lastName: me.lastName ?? '',
        email: me.email,
        defaultNotificationMethod: me.defaultNotificationMethod ?? 'EMAIL',
        timeZoneName: me.timeZoneName,
      }}
      onSubmit={async data => {
        if (mutation.isLoading) return

        mutation.mutate(
          { id: me.id, data },
          {
            onSuccess(res) {
              setHasPendingEmailConf(res.requiresEmailConfirmation)
              notify.success('Your changes were saved.')
              ctx.refetchQueries(['user.me'])
            },
          }
        )
      }}
    >
      {({ values }) => (
        <Form>
          <div className="max-w-lg space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <IVInputField id="firstName" label="First name">
                <Field
                  id="firstName"
                  name="firstName"
                  type="text"
                  className="form-input"
                  placeholder="First name"
                  disabled={mutation.isLoading}
                />
              </IVInputField>
              <IVInputField id="lastName" label="Last name">
                <Field
                  id="lastName"
                  name="lastName"
                  type="text"
                  className="form-input"
                  placeholder="Last name"
                  disabled={mutation.isLoading}
                />
              </IVInputField>
            </div>
            <IVInputField id="email" label="Email address">
              <Field
                id="email"
                name="email"
                type="email"
                className="form-input"
                placeholder="them@example.com"
                disabled={mutation.isLoading}
              />
            </IVInputField>
            <IVInputField id="timeZoneName" label="Time zone">
              <Field
                name="timeZoneName"
                as={IVSelect}
                className="form-input"
                options={TIMEZONE_OPTIONS}
                defaultLabel="Unknown"
              />
            </IVInputField>
            {hasPendingEmailConf && (
              <div className="bg-blue-50 rounded-md text-sm text-blue-900 py-3 px-4">
                We sent you an email to confirm your new email address. Please
                click the link in the email to confirm this change.
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="availability" className="form-label">
                Notifications
              </label>
              <p className="text-gray-500 text-sm">
                Configure where you would like to receive notifications.
              </p>
              <Field
                name="defaultNotificationMethod"
                id="defaultNotificationMethod-email"
                as={IVRadio}
                value="EMAIL"
                label="Email"
                checked={values.defaultNotificationMethod === 'EMAIL'}
              />
              <Field
                name="defaultNotificationMethod"
                id="defaultNotificationMethod-slack"
                as={IVRadio}
                value="SLACK"
                label="Slack"
                disabled={!organization.connectedToSlack}
                checked={values.defaultNotificationMethod === 'SLACK'}
                helpText={
                  !organization.connectedToSlack &&
                  (canManageOrganization ? (
                    <>
                      Enable by connecting to Slack in your{' '}
                      <Link
                        to={`/dashboard/${organization.slug}/organization/settings`}
                        className="font-medium text-primary-500 hover:opacity-60"
                      >
                        organization settings.
                      </Link>
                    </>
                  ) : (
                    <>
                      Contact your organization administrator about connecting
                      your organization to Slack.
                    </>
                  ))
                }
              />
            </div>
          </div>
          <div className="inline-block mt-6">
            <IVButton
              disabled={mutation.isLoading}
              type="submit"
              label="Save changes"
            />
          </div>
          {mutation.isError && (
            <div className="mt-4 px-4 py-3 text-sm font-medium text-red-800 rounded-md bg-red-50">
              Sorry, there was a problem editing your account.
            </div>
          )}
        </Form>
      )}
    </Formik>
  )
}

function UpdatePasswordForm() {
  const mutation = trpc.useMutation('auth.password.edit')

  return (
    <Formik<inferMutationInput<'auth.password.edit'>['data']>
      initialValues={{
        newPassword: '',
        newPasswordConfirm: '',
      }}
      validate={values => {
        if (values.newPassword !== values.newPasswordConfirm) {
          return {
            newPasswordConfirm: 'Passwords do not match',
          }
        }
        if (values.newPassword.length && values.newPassword.length < 6) {
          return {
            newPasswordConfirm: 'Password must be at least 6 characters',
          }
        }

        return {}
      }}
      onSubmit={async (data, { resetForm }) => {
        if (mutation.isLoading) return

        mutation.mutate(
          { data },
          {
            onSuccess() {
              notify('Your password was updated.')
              resetForm()
            },
          }
        )
      }}
    >
      {({ errors, touched }) => (
        <Form>
          <h3 className="h4 mb-4">Update password</h3>

          <div className="max-w-lg space-y-4">
            <IVInputField id="newPassword" label="New password">
              <Field
                id="newPassword"
                name="newPassword"
                type="password"
                className="form-input"
                disabled={mutation.isLoading}
              />
            </IVInputField>
            <IVInputField
              id="newPasswordConfirm"
              label="Confirm new password"
              errorMessage={
                errors.newPasswordConfirm && touched.newPasswordConfirm
                  ? errors.newPasswordConfirm
                  : undefined
              }
            >
              <Field
                id="newPasswordConfirm"
                name="newPasswordConfirm"
                type="password"
                className="form-input"
                disabled={mutation.isLoading}
              />
            </IVInputField>
          </div>
          <div className="inline-block mt-6">
            <IVButton
              disabled={mutation.isLoading}
              type="submit"
              label="Update password"
            />
          </div>
          {mutation.isError && (
            <div className="mt-4 px-4 py-3 text-sm font-medium text-red-800 rounded-md bg-red-50">
              Sorry, there was an error while updating your password.
            </div>
          )}
        </Form>
      )}
    </Formik>
  )
}

function UpdateRoleForm() {
  const mutation = trpc.useMutation('user.edit-role')
  const { orgSlug } = useOrgParams()
  const { me } = useDashboard()

  if (!import.meta.env.DEV) return null

  return (
    <Formik<inferMutationInput<'user.edit-role'>['data']>
      initialValues={{
        orgSlug,
        permission:
          me.userOrganizationAccess.find(
            access => access.organization.slug === orgSlug
          )?.permissions[0] || 'ACTION_RUNNER',
      }}
      onSubmit={async data => {
        if (mutation.isLoading) return

        mutation.mutate(
          { id: me.id, data },
          {
            onSuccess() {
              notify.success('Your role was updated. Reloading...')
              setTimeout(() => window.location.reload(), 1000)
            },
          }
        )
      }}
    >
      <Form>
        <h3 className="h4 mb-2">Change role</h3>

        <div className="max-w-lg space-y-4">
          <IVInputField label="Permission" id="permission">
            <Field
              name="permission"
              as={IVSelect}
              className="form-input"
              options={EXPOSED_ROLES.map(role => ({
                label: userAccessPermissionToString(role),
                value: role,
              }))}
            />
          </IVInputField>
          <IVAPIError error={mutation.error} />
        </div>
        <div className="inline-block mt-6">
          <IVButton
            disabled={mutation.isLoading}
            type="submit"
            label="Update role"
          />
        </div>
      </Form>
    </Formik>
  )
}

function AddMFADialog({
  dialog,
  onSubmit,
}: {
  dialog: DialogStateReturn
  onSubmit: () => void
}) {
  return (
    <IVDialog dialog={dialog} title="Enable MFA">
      {(dialog.visible || dialog.animating) && (
        <EnrollMFAForm onSubmit={onSubmit} />
      )}
    </IVDialog>
  )
}

function RemoveMFADialog({
  dialog,
  onSubmit,
}: {
  dialog: DialogStateReturn
  onSubmit: () => void
}) {
  const challenge = trpc.useMutation(['auth.mfa.challenge'])
  const removeMfa = trpc.useMutation(['auth.mfa.delete'])

  const { mutate: startChallenge } = challenge
  const { visible } = dialog
  useEffect(() => {
    if (visible) {
      startChallenge()
    }
  }, [visible, startChallenge])

  return (
    <IVDialog dialog={dialog} title="Disable MFA">
      <p className="mb-4">
        Enter a code with your current MFA enrollment to disable it.
      </p>
      <Formik<{ code: string }>
        initialValues={{
          code: '',
        }}
        initialErrors={{
          code: 'Please enter a code',
        }}
        onSubmit={async ({ code }) => {
          if (!challenge.data) return

          removeMfa.mutate(
            {
              code,
              challengeId: challenge.data,
            },
            {
              onSuccess() {
                onSubmit()
              },
            }
          )
        }}
        validate={({ code }) => {
          if (!code) {
            return {
              code: 'Please enter a code.',
            }
          }
        }}
      >
        {({ isValid }) => (
          <Form>
            <div className="mb-6 space-y-4">
              <MFAInput isLoading={removeMfa.isLoading} />
              {removeMfa.isError && (
                <div className="px-4 py-3 text-sm font-medium text-red-800 rounded-md bg-red-50">
                  Sorry, that code is invalid. Please try again.
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <IVButton
                type="button"
                label="Cancel"
                theme="secondary"
                disabled={removeMfa.isLoading}
                onClick={() => {
                  dialog.hide()
                }}
              />
              <IVButton
                type="submit"
                label="Disable MFA"
                theme="primary"
                loading={removeMfa.isLoading}
                disabled={!isValid || !challenge.data}
              />
            </div>
          </Form>
        )}
      </Formik>
    </IVDialog>
  )
}

function MFASection() {
  const { organization } = useDashboard()
  const hasMfa = trpc.useQuery(['auth.mfa.has'])
  const addMfaDialog = useDialogState()
  const removeMfaDialog = useDialogState()

  const { invalidateQueries } = trpc.useContext()

  return (
    <div>
      <h3 id="enable-mfa" className="h4 mb-2">
        Multi-factor authentication
      </h3>

      {hasMfa.data ? (
        <>
          <p className="mb-4 text-sm">
            Multi-factor authentication is currently enabled.
          </p>
          <div className="flex gap-2">
            <IVButton
              label="Reset"
              theme="secondary"
              onClick={() => {
                const confirmed = window.confirm(
                  'Are you sure you want to re-enroll in multi-factor authentication? This will remove and invalidate your previous MFA enrollment.'
                )

                if (confirmed) {
                  addMfaDialog.show()
                }
              }}
            />
            {organization.requireMfa ? (
              <IVTooltip
                text={`The ${organization.name} organization requires MFA to be enabled.`}
                placement="right-start"
              >
                <IVButton label="Disable" theme="secondary" disabled />
              </IVTooltip>
            ) : (
              <IVButton
                label="Disable"
                theme="secondary"
                onClick={() => {
                  removeMfaDialog.show()
                }}
              />
            )}
          </div>
        </>
      ) : (
        <div className="space-y-4 text-sm">
          <p>
            <a
              className="font-medium text-primary-500 hover:opacity-60"
              href="https://interval.com/docs/writing-actions/authentication#multi-factor-authentication"
            >
              Multi-factor authentication
            </a>{' '}
            adds an additional layer of security to your account. We strongly
            recommending enabling MFA.
          </p>
          <IVButton
            label="Enable MFA"
            theme="secondary"
            onClick={() => {
              addMfaDialog.show()
            }}
          />
        </div>
      )}

      <AddMFADialog
        dialog={addMfaDialog}
        onSubmit={() => {
          addMfaDialog.hide()
          hasMfa.refetch()
          invalidateQueries('auth.session.session')
          notify.success('Multi-factor authentication is enabled.')
        }}
      />
      <RemoveMFADialog
        dialog={removeMfaDialog}
        onSubmit={() => {
          removeMfaDialog.hide()
          hasMfa.refetch()
          invalidateQueries('auth.session.session')
          notify.success('Multi-factor authentication is disabled.')
        }}
      />
    </div>
  )
}

export default function AccountSettings() {
  const { integrations } = useDashboard()
  const hasPassword = trpc.useQuery(['auth.password.has'])
  return (
    <div className="space-y-12">
      <UpdateAccountForm />
      <UpdateRoleForm />
      {/* These should remain at the bottom of the page to prevent weird flickering */}
      {integrations?.workos && <MFASection />}
      {hasPassword.data && <UpdatePasswordForm />}
    </div>
  )
}
