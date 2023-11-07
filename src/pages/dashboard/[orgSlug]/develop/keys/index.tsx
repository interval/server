import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Field, Form, Formik } from 'formik'
import useClipboard from 'react-use-clipboard'
import { UsageEnvironment } from '@prisma/client'
import IVInputField from '~/components/IVInputField'
import IVButton from '~/components/IVButton'
import { trpc } from '~/utils/trpc'
import IVSpinner from '~/components/IVSpinner'
import PageHeading from '~/components/PageHeading'
import { notify } from '~/components/NotificationCenter'
import useDashboard, { useHasPermission } from '~/components/DashboardContext'
import ApiKeyButton from '~/components/APIKeyButton'
import { useEffect } from 'react'
import Dialog, { useDialogState } from '~/components/IVDialog'
import IconClipboard from '~/icons/compiled/Clipboard'
import KeysList from '~/components/KeysList'
import IVAlert from '~/components/IVAlert'
import IconInfo from '~/icons/compiled/Info'
import IVSelect from '~/components/IVSelect'
import { DEVELOPMENT_ORG_ENV_SLUG } from '~/utils/environments'

function DevKeySelector() {
  const ctx = trpc.useContext()
  const regenerate = trpc.useMutation('key.regenerate', {
    onSuccess() {
      notify.success('API key regenerated')
      ctx.invalidateQueries('key.dev')
    },
  })

  const onRegenerate = useCallback(async () => {
    if (
      !window.confirm(
        'Are you sure you want to regenerate your personal development key?'
      )
    )
      return

    regenerate.mutate()
  }, [regenerate])

  return (
    <div className="flex items-start space-x-2">
      <ApiKeyButton />
      <IVButton
        theme="plain"
        className="text-primary-500 font-medium hover:opacity-70 relative -left-2"
        label="Regenerate"
        onClick={onRegenerate}
      />
    </div>
  )
}

export default function KeysPage() {
  const navigate = useNavigate()
  const { me, organization } = useDashboard()
  const devPermission = useHasPermission('CREATE_DEV_API_KEYS')
  const prodPermission = useHasPermission('CREATE_PROD_API_KEYS')
  const createKeyDialog = useDialogState()
  const [newToken, setNewToken] = useState<string | null>(null)

  const keys = trpc.useQuery(['key.prod', { organizationId: organization.id }])

  const { refetch: refetchKeys } = keys
  const { visible: keyDialogVisible, animating: keyDialogAnimating } =
    createKeyDialog

  useEffect(() => {
    if (!keyDialogVisible) {
      refetchKeys()
    }
  }, [keyDialogVisible, refetchKeys])

  useEffect(() => {
    if (!keyDialogVisible && !keyDialogAnimating) {
      setNewToken(null)
    }
  }, [keyDialogVisible, keyDialogAnimating])

  const onCreateKey = useCallback(
    (token: string) => {
      setNewToken(token)
      refetchKeys()
    },
    [refetchKeys]
  )

  if (prodPermission === false && devPermission === false) {
    navigate('/dashboard')
    return <IVSpinner fullPage />
  }

  return (
    <div className="dashboard-container">
      <PageHeading title="Keys" />

      <div className="mb-8 mt-6">
        <IVAlert
          id="keys-explanation"
          dismissible={true}
          theme="info"
          icon={IconInfo}
          className="mb-4"
        >
          API keys are used to authenticate your account within the SDK and link
          your actions to your Interval dashboard.
        </IVAlert>
        <h2 className="h3 mb-2">Personal development key</h2>
        <div className="max-w-4xl mb-4 text-sm">
          Use this key to develop actions. When an app is started with this key,
          its actions will appear in the{' '}
          <Link
            to="/dashboard/develop"
            className="font-medium text-primary-500 hover:opacity-60"
          >
            Development environment
          </Link>
          .
        </div>
        <DevKeySelector />
      </div>

      <div className="mb-8 mt-6">
        <div className="mb-2 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="h3 mb-2">Live mode keys</h2>
            {prodPermission ? (
              <div className="max-w-4xl text-sm">
                Create live keys when you're ready to{' '}
                <Link
                  to="https://interval.com/docs/"
                  className="font-medium text-primary-500 hover:opacity-60"
                >
                  deploy your actions
                </Link>{' '}
                and make them accessible to your organization.
              </div>
            ) : (
              <div className="max-w-4xl text-sm">
                You don't have permission to create or manage live keys.
              </div>
            )}
          </div>
          {prodPermission && (
            <div className="flex-none">
              <IVButton
                theme="secondary"
                label="Create live key"
                disabled={me.isEmailConfirmationRequired}
                onClick={createKeyDialog.show}
              />
            </div>
          )}
        </div>
        {prodPermission && (
          <>
            {keys.data?.length ? (
              <KeysList keys={keys.data} onUpdate={keys.refetch} />
            ) : (
              <div className="text-center py-8 text-sm text-gray-500">
                {me.isEmailConfirmationRequired ? (
                  <Link
                    to="/confirm-email"
                    className="font-medium text-primary-500 hover:opacity-60"
                  >
                    Confirm your email to create live keys.
                  </Link>
                ) : (
                  <div>
                    {!keys.isLoading && 'You do not have any live mode keys.'}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <Dialog dialog={createKeyDialog} title="Create a live mode key">
        {newToken ? (
          <div>
            <p className="mb-4">
              Please copy your key and keep it somewhere safe, you won't be able
              to see this again.
            </p>
            <InlineCopyKeyButton token={newToken} />
            <div className="mt-8">
              <IVButton
                label="OK"
                onClick={() => {
                  createKeyDialog.hide()
                }}
              />
            </div>
          </div>
        ) : (
          <CreateKeyForm
            usageEnvironment={'PRODUCTION'}
            onSubmit={onCreateKey}
          />
        )}
      </Dialog>
    </div>
  )
}

function InlineCopyKeyButton({ token }: { token: string }) {
  const [isCopied, setCopied] = useClipboard(token, {
    successDuration: 3000,
  })

  useEffect(() => {
    if (isCopied) {
      notify.success('Copied token to clipboard')
    }
  }, [isCopied])

  return (
    <button
      onClick={setCopied}
      className="font-mono inline-flex items-center group max-w-[200px] sm:max-w-full truncate"
    >
      <span className="group-hover:opacity-60 truncate">{token}</span>
      <IconClipboard className="ml-2 w-4 h-4 flex-none" />
    </button>
  )
}

function CreateKeyForm({
  usageEnvironment,
  onSubmit,
}: {
  usageEnvironment: UsageEnvironment
  onSubmit?: (token: string) => void
}) {
  const createKey = trpc.useMutation('key.add')
  const { organization } = useDashboard()

  const environments = organization.environments.filter(
    e => e.slug !== DEVELOPMENT_ORG_ENV_SLUG
  )

  return (
    <Formik<{ label: string; organizationEnvironmentId: string }>
      initialValues={{
        label: '',
        organizationEnvironmentId: environments[0].id,
      }}
      onSubmit={async ({ label, organizationEnvironmentId }, { resetForm }) => {
        if (createKey.isLoading) return

        createKey.mutate(
          {
            label,
            usageEnvironment,
            organizationEnvironmentId,
          },
          {
            onSuccess({ token }) {
              resetForm()
              notify.success(`Key '${label}' was created.`)
              if (onSubmit) {
                onSubmit(token)
              }
            },
          }
        )
      }}
    >
      <Form>
        <div>
          <div className="space-y-4">
            <IVInputField id="label" label="Key label">
              <Field
                id="label"
                name="label"
                type="text"
                placeholder="My new key"
                className="form-input"
                autoFocus
                disabled={createKey.isLoading}
              />
            </IVInputField>
            {environments.length > 1 && (
              <IVInputField id="organizationEnvironmentId" label="Environment">
                <Field
                  id="organizationEnvironmentId"
                  name="organizationEnvironmentId"
                  as={IVSelect}
                  className="w-[180px]"
                  placeholder="Environment"
                  disabled={createKey.isLoading}
                  options={environments.map(env => ({
                    label: env.name,
                    value: env.id,
                  }))}
                />
              </IVInputField>
            )}
            {createKey.isError && (
              <div className="text-red-600">
                Sorry, there was a problem creating the key.
              </div>
            )}
          </div>
          <IVButton
            disabled={createKey.isLoading}
            type="submit"
            label="Create key"
            className="mt-6"
          />
        </div>
      </Form>
    </Formik>
  )
}
