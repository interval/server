import React, { useState, useEffect } from 'react'
import { Navigate, useSearchParams, Link } from 'react-router-dom'
import { Field, Form, Formik } from 'formik'
import { trpc, client, inferMutationInput } from '~/utils/trpc'
import IVInputField from '~/components/IVInputField'
import IVButton from '~/components/IVButton'
import { Organization } from '@prisma/client'
import { notify } from '~/components/NotificationCenter'
import { isOrgSlugValid } from '~/utils/validate'
import useDashboard, { useHasPermission } from '~/components/DashboardContext'
import Dialog, { useDialogState } from '~/components/IVDialog'
import IVTextInput from '~/components/IVTextInput'
import IVTooltip from '~/components/IVTooltip'
import IVCheckbox from '~/components/IVCheckbox'
import SlackIcon from '~/icons/compiled/Slack'
import PageHeading from '~/components/PageHeading'
import IVSpinner from '~/components/IVSpinner'
import NavTabs, { NavTab } from '~/components/NavTabs'
import classNames from 'classnames'

function TabSubSection({
  title,
  children,
  className,
}: {
  title: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={classNames('text-sm', className)}>
      <h3 className="text-lg text-gray-900 font-semibold mb-1">{title}</h3>
      {children}
    </section>
  )
}

export const ORG_SLUG_CONSTRAINTS =
  'Must be at least 2 characters and can only contain lowercase letters, numbers, hyphens, and underscores.'

export async function validateOrgSlugChange(id: string, slug: string) {
  if (!isOrgSlugValid(slug)) {
    return 'Slugs must be at least 2 characters and can only contain lowercase letters, numbers, hyphens, and underscores.'
  }

  const canChange = await client.query('organization.is-slug-available', {
    slug,
    id,
  })

  if (!canChange) {
    return 'Sorry, this slug is taken. Please select another.'
  }
}

function EditOrganizationForm({ org }: { org: Organization }) {
  const ctx = trpc.useContext()
  const editOrganization = trpc.useMutation('organization.edit')

  return (
    <Formik<inferMutationInput<'organization.edit'>['data']>
      initialValues={{
        slug: org.slug,
        name: org.name,
      }}
      initialTouched={{
        // We want any errors to display immediately on change, not on blur
        slug: true,
      }}
      onSubmit={async data => {
        if (editOrganization.isLoading) return

        editOrganization.mutate(
          {
            id: org.id,
            data,
          },
          {
            onSuccess(newOrg) {
              if (newOrg.slug === org.slug) {
                notify.success('Your changes were saved.')
                ctx.refetchQueries(['organization.slug'])
              } else {
                window.location.assign(
                  `/dashboard/${newOrg.slug}/organization/settings?nc-save-success`
                )
              }
            },
          }
        )
      }}
    >
      {({ errors, touched }) => (
        <Form>
          <div className="max-w-xl space-y-4">
            <IVInputField id="name" label="Organization name">
              <Field
                id="name"
                name="name"
                type="text"
                className="form-input"
                placeholder="Name"
                disabled={editOrganization.isLoading}
              />
            </IVInputField>
          </div>
          <div className="max-w-xl space-y-4 pt-4">
            <IVInputField
              id="slug"
              label="Organization slug"
              errorMessage={
                errors.slug && touched.slug ? errors.slug : undefined
              }
              constraints={ORG_SLUG_CONSTRAINTS}
            >
              <Field
                id="slug"
                name="slug"
                type="text"
                className="form-input"
                placeholder="Slug"
                aria-describedby="slug-constraints"
                disabled={editOrganization.isLoading}
                validate={async (slug: string) => {
                  // skip server-side checks if value has not changed from default
                  if (slug === org.slug) return

                  return await validateOrgSlugChange(org.id, slug)
                }}
              />
            </IVInputField>
          </div>
          <div className="inline-block pt-6">
            <IVButton
              disabled={editOrganization.isLoading}
              type="submit"
              label="Save changes"
            />
          </div>
          {editOrganization.isError && (
            <div className="px-4 py-3 text-sm font-medium text-red-800 rounded-md bg-red-50">
              Sorry, there was a problem updating the organization.
            </div>
          )}
        </Form>
      )}
    </Formik>
  )
}

function OrganizationMFAForm() {
  const editMfa = trpc.useMutation('organization.edit.mfa')
  const session = trpc.useQuery(['auth.session.session'])
  const { organization, integrations } = useDashboard()
  const ctx = trpc.useContext()

  const canEnable = !!integrations?.workos && session.data?.hasMfa

  return (
    <Formik<inferMutationInput<'organization.edit.mfa'>>
      initialValues={{
        requireMfa: organization.requireMfa,
      }}
      onSubmit={async data => {
        if (!canEnable || editMfa.isLoading) return

        editMfa.mutate(data, {
          onSuccess(newOrg) {
            notify.success('Your changes were saved.')
            ctx.setQueryData(['organization.slug', { slug: newOrg.slug }], {
              ...organization,
              requireMfa: newOrg.requireMfa,
            })
          },
        })
      }}
    >
      {({ values, setFieldValue }) => (
        <Form>
          <div className="max-w-xl space-y-4">
            <IVInputField id="name" label="Require Multi-factor authentication">
              <IVCheckbox
                id="requireMfa"
                label="Require all members to have MFA enabled"
                checked={values.requireMfa}
                disabled={!canEnable}
                onChange={event => {
                  setFieldValue('requireMfa', event.target.checked)
                }}
                helpText={
                  canEnable ? (
                    'Any users without MFA enabled will immediately be prompted to enable it. This may interrupt workflows, so consider doing this at an off-peak time.'
                  ) : (
                    <>
                      Please{' '}
                      <Link
                        to={`/dashboard/${organization.slug}/account#enable-mfa`}
                        className="font-medium text-primary-500 hover:opacity-60"
                      >
                        enable MFA for your account
                      </Link>{' '}
                      before enabling this setting.
                    </>
                  )
                }
              />
            </IVInputField>
          </div>
          <div className="inline-block pt-6">
            <IVButton
              disabled={!canEnable || editMfa.isLoading}
              type="submit"
              label="Save changes"
            />
          </div>
          {editMfa.isError && (
            <div className="px-4 py-3 text-sm font-medium text-red-800 rounded-md bg-red-50">
              Sorry, there was a problem updating the organization MFA settings.
            </div>
          )}
        </Form>
      )}
    </Formik>
  )
}

function ArchiveForm() {
  const { organization, me } = useDashboard()
  const dialog = useDialogState()
  const archive = trpc.useMutation('organization.delete')

  const [slugConfirmation, setSlugConfirmation] = useState('')

  const { visible, animating } = dialog
  useEffect(() => {
    if (!visible && !animating) {
      setSlugConfirmation('')
    }
  }, [visible, animating])

  const hasOtherOrganizations =
    me.userOrganizationAccess.filter(
      access => access.organization.ownerId === me.id
    ).length > 1

  return (
    <div className="pt-8">
      {hasOtherOrganizations ? (
        <button
          onClick={dialog.show}
          children="Delete organization"
          className="text-red-600 text-sm inline-block py-2"
        />
      ) : (
        <IVTooltip text="You cannot delete your last remaining owned organization.">
          <button
            onClick={() => {
              /* */
            }}
            children="Delete organization"
            className="text-red-600 text-sm opacity-50 inline-block py-2"
          />
        </IVTooltip>
      )}

      <Dialog dialog={dialog} title="Delete organization">
        <div>
          <p className="mt-4">
            <strong>
              Are you sure you want to delete the organization{' '}
              {organization.name}?
            </strong>
          </p>

          <p className="mt-4">
            Deleting {organization.name} will prevent all access to it and its
            actions.
          </p>

          <form
            className="mt-6"
            onSubmit={event => {
              event.preventDefault()

              if (slugConfirmation !== organization.slug) return

              archive.mutate(undefined, {
                onSuccess() {
                  const nextOrg = me.userOrganizationAccess.find(
                    access => access.organization.id !== organization.id
                  )
                  window.location.assign(
                    `/dashboard/${nextOrg?.organization.slug}`
                  )
                },
              })
            }}
          >
            <IVInputField
              label={
                <span>
                  Type <b>{organization.slug}</b> to confirm
                </span>
              }
              id="slug-confirmation"
            >
              <IVTextInput
                id="slug-confirmation"
                value={slugConfirmation}
                onChange={event => {
                  setSlugConfirmation(event.target.value)
                }}
              />
            </IVInputField>

            <div className="mt-8 flex gap-2">
              <IVButton
                type="submit"
                theme="danger"
                label="Delete"
                disabled={slugConfirmation !== organization.slug}
              />
              <IVButton
                theme="secondary"
                label="Cancel"
                onClick={dialog.hide}
              />
            </div>
          </form>
        </div>
      </Dialog>
    </div>
  )
}

function SlackIntegrationsForm() {
  const startOauth = trpc.useMutation('organization.start-slack-oauth')
  const { organization } = useDashboard()

  const onClick = e => {
    e.preventDefault()

    if (startOauth.isLoading) return

    startOauth.mutate(null, {
      onSuccess(authUrl) {
        window.location.href = authUrl
      },
    })
  }

  const [searchParams, setSearchParams] = useSearchParams()

  const oauthMessage = code => {
    switch (code) {
      case 'success':
        return 'Connected your Slack workspace'
      case 'access_denied':
        return 'Must allow permissions to connect to Slack'
      case 'invalid_state_param':
        return 'Invalid OAuth state, try again'
      default:
        return 'Something went wrong'
    }
  }

  useEffect(() => {
    // check for some query param in redirect from
    // web/src/server/api/auth/oauth/slack.ts
    const oauthResult = searchParams.get('oauth_result')
    if (oauthResult) {
      const toastDuration = 4000
      if (oauthResult === 'success' && organization.connectedToSlack) {
        notify.success(oauthMessage(oauthResult), {
          id: 'oauth-toast',
          duration: toastDuration,
        })
      } else {
        // if 'success' but still not connected, override success message
        const result =
          oauthResult === 'success' ? 'Something went wrong' : oauthResult
        notify.error(oauthMessage(result), {
          id: 'oauth-toast',
          duration: toastDuration,
        })
      }
      const errorTimeout = setTimeout(() => setSearchParams({}), toastDuration)
      return () => clearTimeout(errorTimeout)
    }
  })

  return (
    <TabSubSection title="Slack">
      {organization.connectedToSlack ? (
        <>
          <p className="mb-3">
            Your Slack workspace is connected to Interval 👍
          </p>
          <p className="mb-3">
            <a
              onClick={onClick}
              className="font-medium text-primary-500 hover:opacity-60"
              href="#"
            >
              Click here to reconnect
            </a>
            .
          </p>
          <p className="mb-3">
            <a
              className="font-medium text-primary-500 hover:opacity-60"
              href="https://interval.com/docs/writing-actions/notifications"
            >
              To send notifications to a Slack channel
            </a>
            , you'll also have to add the Interval app to that channel.
          </p>
        </>
      ) : (
        <>
          <p className="mb-3">
            Connect your Slack workspace to Interval to enable{' '}
            <a
              className="font-medium text-primary-500 hover:opacity-60"
              href="https://interval.com/docs/writing-actions/notifications"
            >
              sending notifications to Slack channels or users
            </a>
            .
          </p>
          {startOauth.error && (
            <div className="px-4 py-3 mb-3 text-sm font-medium text-red-800 rounded-md bg-red-50">
              {startOauth.error.message}
            </div>
          )}
          <IVButton
            theme="secondary"
            label={
              <span className="flex align-middle gap-2">
                <SlackIcon className="inline-block h-5 w-5" />
                Add to Slack
              </span>
            }
            onClick={onClick}
          />
        </>
      )}
    </TabSubSection>
  )
}

export default function OrganizationSettings() {
  const { organization, me, integrations } = useDashboard()
  const canConnectOauth = useHasPermission('WRITE_ORG_OAUTH')
  const canWriteSettings = useHasPermission('WRITE_ORG_SETTINGS')
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab')

  if (canWriteSettings === undefined) {
    return <IVSpinner fullPage delayDuration={100} />
  }

  if (canWriteSettings === false) {
    return <Navigate to="/dashboard" />
  }

  let canAccessIntegrations = canConnectOauth && integrations?.slack

  const navItems: NavTab[] = [{ path: '', tab: null, label: 'General' }]

  if (integrations?.workos) {
    navItems.push({
      path: '?tab=security',
      tab: 'security',
      label: 'Security',
    })
  }

  if (canAccessIntegrations) {
    navItems.push({
      path: '?tab=integrations',
      tab: 'integrations',
      label: 'Integrations',
      enabled: canConnectOauth,
    })
  }

  return (
    <div className="dashboard-container">
      <PageHeading title="Organization settings" />

      <div className="mt-4 mb-6">
        <NavTabs
          tabs={navItems.map(item => ({
            ...item,
            path: `/dashboard/${organization.slug}/organization/settings${item.path}`,
          }))}
        />
      </div>

      <div className="space-y-8">
        {tab === 'security' && integrations?.workos ? (
          <OrganizationMFAForm />
        ) : tab === 'integrations' && canAccessIntegrations ? (
          <SlackIntegrationsForm />
        ) : (
          <>
            <EditOrganizationForm org={organization} />
            {me.id === organization.ownerId && <ArchiveForm />}
          </>
        )}
      </div>
    </div>
  )
}
