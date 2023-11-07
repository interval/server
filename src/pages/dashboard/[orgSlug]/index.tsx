import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ActionGroup, Transaction } from '@prisma/client'
import { inferQueryOutput, trpc, useQueryClient } from '~/utils/trpc'
import PageHeading from '~/components/PageHeading'
import SectionHeading from '~/components/SectionHeading'
import useDashboard, { useHasPermission } from '~/components/DashboardContext'
import { dateTimeFormatter } from '~/utils/formatters'
import IVUnstyledButtonOrLink, {
  IVUnstyledButtonOrLinkProps,
} from '~/components/IVUnstyledButtonOrLink'
import IVStatusPill from '~/components/IVStatusPill'
import IconActions from '~/icons/compiled/Actions'
import IconCancel from '~/icons/compiled/Cancel'
import IconCircledPlay from '~/icons/compiled/CircledPlay'
import EmptyState from '~/components/EmptyState'
import QueuedActionsList from '~/components/QueuedActionsList'
import Dialog, { useDialogState } from '~/components/IVDialog'
import IVButton from '~/components/IVButton'
import ActionsList from '~/components/ActionsList'
import { getName } from '~/utils/actions'
import { useOrgParams } from '~/utils/organization'
import PageUI from '~/components/PageUI'
import IVSpinner from '~/components/IVSpinner'

interface TransactionAccessoryButtonProps extends IVUnstyledButtonOrLinkProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

export function TransactionAccessoryButton(
  props: TransactionAccessoryButtonProps
) {
  return (
    <IVUnstyledButtonOrLink
      {...props}
      className="flex items-center justify-between px-4 flex-1 text-sm text-gray-700 font-medium hover:text-gray-500"
    >
      <span>{props.children}</span>
      <props.icon className="ml-3 w-5 h-5 text-gray-400" aria-hidden="true" />
    </IVUnstyledButtonOrLink>
  )
}

function DashboardEmptyState() {
  const canAccessDev = useHasPermission('READ_DEV_ACTIONS')

  return (
    <EmptyState
      Icon={IconActions}
      title="Nothing here yet"
      children={
        <div className="text-left max-w-lg space-y-2">
          <p>
            Actions are the internal tools you build with Interval, created from
            within your project's codebase.
          </p>
          {canAccessDev && (
            <p>
              <Link
                to={`/dashboard/develop/actions`}
                className="text-primary-500 font-medium hover:opacity-60"
              >
                Visit the Development environment
              </Link>{' '}
              to install the SDK and develop your first actions. Then{' '}
              <Link
                to={`/dashboard/develop/keys`}
                className="text-primary-500 font-medium hover:opacity-60"
              >
                create a live key
              </Link>{' '}
              and{' '}
              <Link
                to="https://interval.com/docs/deployments"
                className="text-primary-500 font-medium hover:opacity-60"
              >
                deploy
              </Link>{' '}
              for them to appear here.
            </p>
          )}
        </div>
      }
      actions={
        canAccessDev
          ? [
              {
                theme: 'secondary',
                href: `/dashboard/develop/actions`,
                label: <span>Go to Development &rsaquo;</span>,
              },
            ]
          : undefined
      }
    />
  )
}

function PageEmptyState() {
  return (
    <EmptyState
      Icon={IconActions}
      title="Nothing here yet"
      children={
        <div className="text-left max-w-lg space-y-2">
          <p>
            <Link
              to={`/docs/writing-actions/routing#defining-routes`}
              className="text-primary-500 font-medium hover:opacity-60"
            >
              Add actions
            </Link>{' '}
            to this route or{' '}
            <Link
              to={`/docs/writing-actions/routing#rendering-pages`}
              className="text-primary-500 font-medium hover:opacity-60"
            >
              render a layout
            </Link>{' '}
            to populate this page.
          </p>
        </div>
      }
    />
  )
}

function TransactionList({
  organization,
  transactions,
  onCancel,
}: {
  organization: { id: string; slug: string }
  transactions: inferQueryOutput<'dashboard.home.index'>['transactions']
  onCancel: (transaction: Transaction) => void
}) {
  const [cancelId, setCancelId] = useState<string | null>(null)
  const cancelDialog = useDialogState()

  {
    const { hide, show, visible, animating } = cancelDialog
    useEffect(() => {
      if (cancelId) {
        show()
      } else {
        hide()
      }
    }, [cancelId, hide, show])
    useEffect(() => {
      if (!visible && !animating) {
        setCancelId(null)
      }
    }, [visible, animating])
  }

  if (transactions.length === 0) return null

  return (
    <div>
      <SectionHeading title="In progress" />
      <ul role="list" className="grid mt-6 space-y-4">
        {transactions.map(t => (
          <li
            key={t.id}
            className="col-span-1 bg-white rounded-lg border divide-x divide-gray-200 flex justify-between"
          >
            <div className="w-full flex items-center justify-between p-6 space-x-6">
              <div className="flex-1 truncate md:flex flex-row items-center md:space-x-2">
                <div className="flex items-center space-x-3">
                  {t.status === 'AWAITING_INPUT' && (
                    <IVStatusPill kind="warn" label="Requires input" />
                  )}
                  <span className="text-gray-900 text-lg font-medium truncate">
                    {getName(t.action)}
                  </span>
                </div>

                <span className="text-gray-500 text-sm font-medium truncate">
                  Started {dateTimeFormatter.format(t.createdAt)}
                </span>
              </div>
            </div>
            <div className="flex flex-col divide-y">
              <TransactionAccessoryButton
                href={`/dashboard/${organization.slug}/transactions/${t.id}`}
                children="Continue"
                icon={IconCircledPlay}
              />
              <TransactionAccessoryButton
                onClick={() => {
                  setCancelId(t.id)
                }}
                children="Cancel"
                icon={IconCancel}
              />
            </div>
          </li>
        ))}
      </ul>
      <Dialog dialog={cancelDialog} title="Cancel transaction">
        <CancelTransactionForm
          transactionId={cancelId}
          onClose={cancelDialog.hide}
          onSubmit={onCancel}
        />
      </Dialog>
    </div>
  )
}

export function OrganizationDashboard({
  slugPrefix,
  pageTitle,
  breadcrumbs,
}: {
  slugPrefix?: string
  pageTitle?: string
  breadcrumbs?: ActionGroup[]
}) {
  const { organization, organizationEnvironment } = useDashboard()

  const result = trpc.useQuery([
    'dashboard.home.index',
    {
      slugPrefix,
    },
  ])

  {
    const { remove, refetch } = result
    useEffect(() => {
      remove()
      refetch()
    }, [organizationEnvironment.id, remove, refetch])
  }
  const queryClient = useQueryClient()

  const canRunActions = useHasPermission('RUN_PROD_ACTIONS')
  const canConfigureActions = useHasPermission('WRITE_PROD_ACTIONS')
  const canDequeue = useHasPermission('DEQUEUE_PROD_ACTIONS')

  const hasAnyActions =
    result.data?.actions.length || result.data?.groups.length

  if (result.isLoading) {
    return <IVSpinner fullPage />
  }

  if (result.isLoading || !result.data) {
    return <IVSpinner delayDuration={300} fullPage />
  }

  const fallback = (
    <div className="dashboard-container">
      <div className="-mb-2">
        <PageHeading
          title={pageTitle ?? 'Dashboard'}
          breadcrumbs={breadcrumbs}
        />
      </div>
      {result.data && (
        <div className="space-y-8">
          <TransactionList
            organization={organization}
            transactions={result.data.transactions}
            onCancel={transaction => {
              queryClient.setQueryData(
                ['dashboard.home.index', { slugPrefix }],
                {
                  ...result.data,
                  transactions: result.data.transactions.filter(
                    t => t.id !== transaction.id
                  ),
                }
              )
            }}
          />
          <QueuedActionsList
            mode="live"
            className="my-6"
            queuedActions={result.data.queuedActions}
            canDequeue={canDequeue}
            onChange={queuedAction => {
              queryClient.setQueryData(
                ['dashboard.home.index', { slugPrefix }],
                {
                  ...result.data,
                  queuedActions: result.data.queuedActions.filter(
                    q => q.id !== queuedAction.id
                  ),
                }
              )
            }}
          />
          <ActionsList
            canRun={canRunActions}
            canConfigure={canConfigureActions}
            actions={result.data.actions}
            archivedActions={result.data.archivedActions}
            groups={result.data.groups}
            mode="live"
            slugPrefix={slugPrefix}
          />
          {!hasAnyActions &&
            (result.data?.currentPage ? (
              <PageEmptyState />
            ) : (
              <DashboardEmptyState />
            ))}
        </div>
      )}
    </div>
  )

  if (result.data.currentPage?.hasHandler && result.data.currentPage?.canRun) {
    return (
      <PageUI
        page={result.data.currentPage}
        mode="live"
        breadcrumbs={breadcrumbs}
        fallback={fallback}
      />
    )
  }

  return fallback
}

function CancelTransactionForm({
  transactionId,
  onSubmit,
  onClose,
}: {
  transactionId: string | null
  onSubmit: (transaction: Transaction) => void
  onClose: () => void
}) {
  const cancel = trpc.useMutation(['transaction.cancel'])

  return (
    <div>
      <p>Are you sure you want to cancel this transaction?</p>
      <p>This cannot be undone.</p>

      <div className="mt-8 flex gap-2">
        <IVButton
          autoFocus
          tabIndex={1}
          theme="danger"
          label="Cancel transaction"
          onClick={() => {
            if (!transactionId) return

            cancel.mutate(
              {
                transactionId,
              },
              {
                onSuccess(transaction) {
                  onSubmit(transaction)
                  onClose()
                },
              }
            )
          }}
        />
        <IVButton
          theme="secondary"
          label="Close"
          onClick={onClose}
          tabIndex={2}
        />
      </div>
    </div>
  )
}

export default function OrganizationDashboardPage() {
  const { orgEnvSlug } = useOrgParams()
  return <Navigate to={`/dashboard/${orgEnvSlug}/actions`} replace />
}
