import { Formik, Form, Field } from 'formik'
import { NotificationMethod } from '@prisma/client'
import { inferQueryOutput, trpc } from '~/utils/trpc'
import { useOrganization } from '~/components/DashboardContext'
import IVInputField from '~/components/IVInputField'
import IVSelect from '~/components/IVSelect'
import { Link } from 'react-router-dom'
import IVButton from '~/components/IVButton'

type NotificationMethodOption = 'EMAIL' | 'SLACK' | 'ACTION_RUNNER'

function validateSlackChannel(value: string | undefined) {
  if (!value || value === '') {
    return 'Please select a Slack channel.'
  }
}

function validateNotificationEmail(value: string | undefined) {
  if (!value || value === '') {
    return 'Please enter an email address.'
  }
}

export default function ActionNotificationsSettings({
  action,
  onSuccess,
  onError,
}: {
  action: inferQueryOutput<'action.one'>
  onSuccess: () => void
  onError: () => void
  refetch: () => void
}) {
  const slackChannels = trpc.useQuery(['organization.slack-channels'])
  const updateMeta = trpc.useMutation('action.notifications.update')
  const organization = useOrganization()

  let defaultNotificationMethod: NotificationMethodOption = 'ACTION_RUNNER'
  let notificationEmail = ''
  let slackChannel = ''
  if (
    action.metadata?.defaultNotificationDelivery &&
    typeof action.metadata?.defaultNotificationDelivery === 'string'
  ) {
    let delivery = JSON.parse(action.metadata.defaultNotificationDelivery)
    if (Array.isArray(delivery)) {
      delivery = delivery[0]

      if (delivery['method']) {
        defaultNotificationMethod = delivery['method']
      }
      if (delivery['method'] === 'EMAIL') {
        notificationEmail = delivery['to']
      }
      if (delivery['method'] === 'SLACK') {
        slackChannel = delivery['to']
      }
    }
  }

  return (
    <Formik<{
      defaultNotificationMethod: NotificationMethodOption
      notificationEmail: string
      slackChannel: string
    }>
      initialValues={{
        defaultNotificationMethod,
        notificationEmail,
        slackChannel,
      }}
      validate={values => {
        const errors: { [key: string]: string } = {}
        if (values.defaultNotificationMethod === 'EMAIL') {
          const emailError = validateNotificationEmail(values.notificationEmail)
          if (emailError) errors.notificationEmail = emailError
        }
        if (values.defaultNotificationMethod === 'SLACK') {
          if (!organization.connectedToSlack) {
            errors.defaultNotificationMethod = 'Please connect to Slack first.'
          }
          const slackError = validateSlackChannel(values.slackChannel)
          if (slackError) errors.slackChannel = slackError
        }
        return errors
      }}
      validateOnBlur={false}
      validateOnChange={false}
      onSubmit={async data => {
        if (updateMeta.isLoading) return

        let defaultNotificationDelivery:
          | { method: NotificationMethod; to: string }[]
          | null = null
        if (data.defaultNotificationMethod === 'ACTION_RUNNER') {
          defaultNotificationDelivery = null
        } else if (data.defaultNotificationMethod === 'EMAIL') {
          defaultNotificationDelivery = [
            {
              method: 'EMAIL',
              to: data.notificationEmail,
            },
          ]
        } else if (data.defaultNotificationMethod === 'SLACK') {
          defaultNotificationDelivery = [
            {
              method: 'SLACK',
              to: data.slackChannel,
            },
          ]
        }

        updateMeta.mutate(
          {
            actionId: action.id,
            data: {
              defaultNotificationDelivery,
            },
          },
          {
            onSuccess,
            onError,
          }
        )
      }}
    >
      {({ values, errors, setFieldValue, setErrors, isValid }) => (
        <Form>
          <div className="space-y-4">
            {/* not a "real" setting, per se */}
            <IVInputField
              id="inputRequired"
              label="When input is required:"
              className="max-w-xs"
              constraints="Interval sends automatic notifications to the person running the action when input is required for the action to continue running and when the action completes."
            >
              <div className="py-2 text-gray-500">Notify the action runner</div>
            </IVInputField>

            <IVInputField
              id="customNotification"
              label="When an action sends a custom notification:"
            >
              <div className="space-y-2">
                <div className="max-w-xs">
                  <Field
                    as={IVSelect}
                    name="defaultNotificationMethod"
                    options={[
                      {
                        value: 'ACTION_RUNNER',
                        label: 'Notify the action runner',
                      },
                      {
                        value: 'EMAIL',
                        label: 'Send to an email address',
                      },
                      {
                        value: 'SLACK',
                        label: 'Send to a Slack channel',
                      },
                    ]}
                    onChange={e => {
                      setFieldValue('defaultNotificationMethod', e.target.value)
                      setErrors({})
                    }}
                  />
                </div>
                {values.defaultNotificationMethod === 'EMAIL' && (
                  <IVInputField
                    id="notificationEmail"
                    errorMessage={errors.notificationEmail}
                    className="max-w-xs"
                  >
                    <Field
                      id="notificationEmail"
                      name="notificiationEmail"
                      type="email"
                      className="form-input"
                      placeholder="them@example.com"
                      value={values.notificationEmail}
                      disabled={values.defaultNotificationMethod !== 'EMAIL'}
                      onChange={e => {
                        setFieldValue('notificationEmail', e.target.value, true)
                      }}
                    />
                  </IVInputField>
                )}
                {values.defaultNotificationMethod === 'SLACK' && (
                  <>
                    {organization.connectedToSlack ? (
                      <IVInputField
                        id="slackChannel"
                        errorMessage={errors.slackChannel}
                        helpText="You'll have to add the Interval app to Slack channels to enable receiving notifications and for them to appear here."
                      >
                        <div className="max-w-xs">
                          <IVSelect
                            id="slackChannel"
                            name="slackChannel"
                            disabled={
                              values.defaultNotificationMethod !== 'SLACK'
                            }
                            value={values.slackChannel}
                            options={
                              slackChannels.data?.map(channel => ({
                                label: `#${channel}`,
                                value: `#${channel}`,
                              })) ?? []
                            }
                            defaultLabel="Select a channel"
                            onChange={e => {
                              setFieldValue(
                                'slackChannel',
                                e.target.value,
                                true
                              )
                            }}
                          />
                        </div>
                      </IVInputField>
                    ) : (
                      <IVInputField
                        id="slackChannel"
                        errorMessage={errors.slackChannel}
                      >
                        <p className="py-2">
                          Please{' '}
                          <Link
                            to={`/dashboard/${organization.slug}/organization/settings`}
                            className="font-semibold hover:opacity-70 text-primary-500"
                          >
                            connect to Slack
                          </Link>{' '}
                          first to enable this setting.
                        </p>
                      </IVInputField>
                    )}
                  </>
                )}
              </div>
            </IVInputField>
          </div>
          <div className="mt-12">
            <IVButton
              loading={updateMeta.isLoading}
              disabled={
                !isValid ||
                (!organization.connectedToSlack &&
                  values.defaultNotificationMethod === 'SLACK')
              }
              type="submit"
              label="Save changes"
            />
          </div>
        </Form>
      )}
    </Formik>
  )
}
