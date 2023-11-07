import { useEffect, useMemo } from 'react'
import classNames from 'classnames'
import { Field, Form, Formik, useFormikContext } from 'formik'
import { trpc, inferQueryOutput, useQueryClient } from '~/utils/trpc'
import IVInputField from '~/components/IVInputField'
import IVButton from '~/components/IVButton'
import PageHeading from '~/components/PageHeading'
import { useHasPermission } from '~/components/DashboardContext'
import IconRocket from '~/icons/compiled/Rocket'
import IconOnline from '~/icons/compiled/Online'
import IconOffline from '~/icons/compiled/Offline'
import { DialogStateReturn } from 'reakit'
import IVDialog, { useDialogState } from '~/components/IVDialog'
import EmptyState from '~/components/EmptyState'
import { hostStatusToString } from '~/utils/text'
import relativeTime from '~/utils/date'
import IVSpinner from '~/components/IVSpinner'
import { isUrl } from '~/utils/url'
import SimpleTable from '~/components/SimpleTable'
import useTable, { IVTableRow } from '~/components/IVTable/useTable'
import IconRefresh from '~/icons/compiled/Refresh'

function HttpHostList({
  hosts,
}: {
  hosts: inferQueryOutput<'http-hosts.list'>
}) {
  const queryClient = useQueryClient()
  const checkHost = trpc.useMutation('http-hosts.check', {
    onSuccess(host) {
      queryClient.setQueryData(
        ['http-hosts.list'],
        (hosts: inferQueryOutput<'http-hosts.list'> | undefined) => {
          if (!hosts?.length) return [host]

          return hosts.map(h => (h.id === host.id ? host : h))
        }
      )
    },
  })
  const deleteHost = trpc.useMutation('http-hosts.delete', {
    onSuccess(host) {
      queryClient.setQueryData(
        ['http-hosts.list'],
        (hosts: inferQueryOutput<'http-hosts.list'> | undefined) => {
          if (!hosts) return []

          return hosts.filter(h => h.id !== host.id)
        }
      )
    },
  })

  const data = useMemo<IVTableRow[]>(() => {
    return hosts.map((host, idx) => ({
      key: String(idx),
      data: {
        status: (
          <div
            className={classNames('flex items-center gap-1', {
              'text-green-700': host.status === 'ONLINE',
              'text-red-700': host.status === 'OFFLINE',
              'text-amber-700': host.status === 'UNREACHABLE',
            })}
          >
            {host.status === 'ONLINE' ? (
              <IconOnline className="w-4 h-4" />
            ) : (
              <IconOffline className="w-4 h-4" />
            )}
            {hostStatusToString(host.status)}
          </div>
        ),
        url: <span className="font-mono">{host.url}</span>,
        updatedAt: (
          <div className="inline-flex items-center">
            {relativeTime(host.updatedAt)}
            <button
              className="ml-1 text-gray-500 hover:text-primary-500"
              disabled={checkHost.isLoading}
              onClick={() => checkHost.mutate({ id: host.id })}
            >
              <IconRefresh className="w-4 h-4" />
            </button>
          </div>
        ),
        actions: (
          <button
            key="delete"
            className="text-red-600 hover:opacity-60"
            onClick={() => {
              if (
                window.confirm(
                  `Are you sure you want to delete the serverless endpoint with URL ${host.url}?`
                )
              ) {
                deleteHost.mutate({ id: host.id })
              }
            }}
          >
            Delete
          </button>
        ),
      },
    }))
  }, [hosts, checkHost, deleteHost])

  const table = useTable({
    data,
    columns: ['Status', 'URL', 'Last checked', ''],
  })

  return (
    <div className="pt-4">
      <SimpleTable table={table} />
    </div>
  )
}

function AddHostDialog({
  onSubmit,
  dialog,
}: {
  onSubmit?: () => void
  dialog: DialogStateReturn
}) {
  const addHost = trpc.useMutation('http-hosts.add', {
    onSuccess() {
      dialog.hide()
      if (onSubmit) {
        onSubmit()
      }
    },
  })

  const isHidden = !dialog.visible && !dialog.animating

  return (
    <IVDialog dialog={dialog} title="Add serverless endpoint">
      <Formik<{ url: string }>
        initialValues={{
          url: '',
        }}
        onSubmit={async ({ url }) => {
          if (addHost.isLoading) return

          addHost.mutate({
            url,
          })
        }}
      >
        {({ touched, errors }) => (
          <Form>
            <div className="space-y-4">
              <IVInputField
                id="url"
                label="Serverless endpoint URL"
                errorMessage={(touched.url && errors.url) || addHost.isError}
              >
                <Field
                  id="url"
                  name="url"
                  placeholder="https://example.com/interval"
                  autoFocus
                  required
                  className="form-input"
                  validate={(value: string) => {
                    if (!isUrl(value)) {
                      return 'Please enter a valid URL.'
                    }
                  }}
                />
              </IVInputField>
              {addHost.isError && (
                <div className="px-4 py-3 text-sm font-medium text-red-800 rounded-md bg-red-50">
                  <p>Sorry, there was a problem adding the host.</p>
                  {addHost.error?.data?.code === 'NOT_FOUND' && (
                    <p className="mt-2">
                      Are you sure a serverless endpoint is available at that
                      URL?
                    </p>
                  )}
                  {addHost.error?.data?.code === 'BAD_REQUEST' && (
                    <p className="mt-2">
                      Is there already an endpoint configured at this URL?
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="mt-6">
              <IVButton
                disabled={addHost.isLoading}
                type="submit"
                label="Add serverless endpoint"
              />
            </div>
            <ResetFormToken isResetReady={isHidden} />
          </Form>
        )}
      </Formik>
    </IVDialog>
  )
}

function ResetFormToken({ isResetReady }: { isResetReady: boolean }) {
  const { resetForm } = useFormikContext()
  useEffect(() => {
    if (isResetReady) resetForm()
  }, [resetForm, isResetReady])

  return null
}

export default function HostEndpointsPage() {
  useHasPermission('READ_PROD_ACTIONS', { redirectToDashboardHome: true })
  const canAddHost = useHasPermission('WRITE_PROD_ACTIONS')

  const addHostDialog = useDialogState()

  const hosts = trpc.useQuery(['http-hosts.list'])

  return (
    <div className="dashboard-container">
      <PageHeading
        title="Serverless endpoints"
        actions={
          canAddHost
            ? [
                {
                  label: 'Add endpoint',
                  onClick: () => {
                    addHostDialog.show()
                  },
                },
              ]
            : undefined
        }
      />

      {hosts.data ? (
        hosts.data.length ? (
          <HttpHostList hosts={hosts.data} />
        ) : (
          <EmptyState
            Icon={IconRocket}
            title="Add a serverless endpoint"
            actions={
              canAddHost
                ? [
                    {
                      label: 'Add endpoint',
                      onClick: () => {
                        addHostDialog.show()
                      },
                    },
                    {
                      label: 'Documentation',
                      theme: 'secondary',
                      href: '/docs/deployments/serverless',
                      absolute: true,
                    },
                  ]
                : undefined
            }
          >
            <p>Serverless endpoints are an alternative way to host actions.</p>
            <p>
              Instead of a persistent connection, these endpoints listen at a
              URL and are spawned on demand, making them suitable for serverless
              workflows.
            </p>
          </EmptyState>
        )
      ) : (
        <IVSpinner />
      )}
      <AddHostDialog dialog={addHostDialog} onSubmit={hosts.refetch} />
    </div>
  )
}
