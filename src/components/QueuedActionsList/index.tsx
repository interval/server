import { useState, useEffect } from 'react'
import { RawActionReturnData } from '@interval/sdk/dist/ioSchema'
import { QueuedAction } from '@prisma/client'
import relativeTime from '~/utils/date'
import { dateTimeFormatter } from '~/utils/formatters'
import { ActionMode, QueuedActionWithPossibleMetadata } from '~/utils/types'
import { trpc } from '~/utils/trpc'
import Dialog, { useDialogState } from '~/components/IVDialog'
import IVButton from '~/components/IVButton'
import KeyValueTable from '~/components/KeyValueTable'
import SectionHeading from '~/components/SectionHeading'
import { notify } from '~/components/NotificationCenter'
import { useOrgParams } from '~/utils/organization'

export default function QueuedActionsList({
  queuedActions,
  canDequeue,
  className = '',
  onChange,
  mode,
}: {
  queuedActions: QueuedActionWithPossibleMetadata[]
  className?: string
  canDequeue?: boolean
  onChange?: (queuedAction: QueuedAction) => void
  mode: ActionMode
}) {
  const { orgEnvSlug } = useOrgParams()
  const [dequeueId, setDequeueId] = useState<string | null>(null)
  const dequeueDialog = useDialogState()

  {
    const { show, hide, visible } = dequeueDialog
    useEffect(() => {
      if (dequeueId) {
        show()
      } else {
        hide()
      }
    }, [dequeueId, hide, show])

    useEffect(() => {
      if (!visible) setDequeueId(null)
    }, [visible])
  }

  if (queuedActions.length === 0) {
    return null
  }

  return (
    <div className={className}>
      <SectionHeading title="Queue" />
      <ul role="list" className="mt-2 space-y-4">
        {queuedActions.map(queuedAction => (
          <li key={queuedAction.id} className="bg-white rounded-lg border p-5">
            <div className="w-full md:flex items-center">
              <div className="flex-1">
                <h3 className="text-gray-900 text-lg font-medium truncate">
                  {queuedAction.action.metadata?.name ??
                    queuedAction.action.slug}
                </h3>

                <p className="flex items-center justify-start text-gray-500 text-sm">
                  {/* TODO: use an icon builder that supports multiple paths */}
                  <svg
                    viewBox="0 0 30 30"
                    fill="currentColor"
                    className="w-4 h-4 mr-1.5"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M15.25 4.89062C9.52868 4.89062 4.89063 9.52867 4.89063 15.25C4.89063 20.9713 9.52868 25.6094 15.25 25.6094C20.9713 25.6094 25.6094 20.9713 25.6094 15.25C25.6094 9.52867 20.9713 4.89062 15.25 4.89062ZM2.5 15.25C2.5 8.20837 8.20837 2.5 15.25 2.5C22.2916 2.5 28 8.20837 28 15.25C28 22.2916 22.2916 28 15.25 28C8.20837 28 2.5 22.2916 2.5 15.25Z" />
                    <path d="M13.5647 15.0119V9.83034C13.5647 9.10862 14.161 8.52355 14.8827 8.52355V8.52355C15.6045 8.52355 16.2008 9.10862 16.2008 9.83034V14.4659C16.2008 14.8125 16.3385 15.1449 16.5835 15.39L18.4055 17.2119C18.9158 17.7223 18.9079 18.5577 18.3975 19.068V19.068C17.8872 19.5783 17.0518 19.5863 16.5415 19.076L14.3335 16.8679C13.8412 16.3757 13.5647 15.708 13.5647 15.0119Z" />
                  </svg>
                  {dateTimeFormatter.format(queuedAction.createdAt)}
                  {queuedAction.transaction && (
                    <span>
                      <span className="mx-2">&middot;</span>
                      started{' '}
                      <time
                        title={dateTimeFormatter.format(
                          queuedAction.transaction.createdAt
                        )}
                      >
                        {relativeTime(queuedAction.transaction.createdAt, {
                          fullDateThresholdInHours: 24,
                        })}
                      </time>
                    </span>
                  )}
                </p>
              </div>
              <div className="flex-none flex flex-col gap-2">
                <div
                  className="flex flex-col"
                  data-pw="queued-action"
                  data-pw-queued-action-slug={queuedAction.action.slug}
                >
                  <IVButton
                    href={`/dashboard/${orgEnvSlug}/${
                      mode === 'live'
                        ? `actions/${queuedAction.action.slug}`
                        : `develop/actions/${queuedAction.action.slug}`
                    }`}
                    theme="secondary"
                    label={queuedAction.transaction ? 'Continue' : 'Begin'}
                    state={{ queuedActionId: queuedAction.id }}
                    className="w-full mt-4 md:mt-0 md:w-auto"
                    options={
                      canDequeue
                        ? [
                            {
                              label: 'Cancel',
                              onClick: () => {
                                setDequeueId(queuedAction.id)
                              },
                            },
                          ]
                        : undefined
                    }
                  />
                </div>
              </div>
            </div>
            {queuedAction.params && (
              <div className="mt-4">
                <KeyValueTable
                  data={queuedAction.params as RawActionReturnData}
                  maxLines={2}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
      <Dialog dialog={dequeueDialog} title="Dequeue action">
        <CancelForm
          queuedActionId={dequeueId}
          onSubmit={queuedAction => {
            setDequeueId(null)
            notify.success('Action dequeued.')
            if (onChange) onChange(queuedAction)
          }}
          onClose={() => {
            setDequeueId(null)
          }}
        />
      </Dialog>
    </div>
  )
}

function CancelForm({
  queuedActionId,
  onSubmit,
  onClose,
}: {
  queuedActionId: string | null
  onSubmit: (queuedAction: QueuedAction) => void
  onClose: () => void
}) {
  const dequeue = trpc.useMutation('action.dequeue')

  return (
    <div>
      <p>Are you sure you want to dequeue this action?</p>
      <p>This cannot be undone.</p>

      <div className="mt-8 flex gap-2">
        <IVButton
          theme="danger"
          label="Dequeue action"
          autoFocus
          onClick={() => {
            if (!queuedActionId) return
            dequeue.mutate(
              { queuedActionId },
              {
                onSuccess(queuedAction) {
                  if (onSubmit) onSubmit(queuedAction)
                },
              }
            )
          }}
        />
        <IVButton theme="secondary" label="Close" onClick={onClose} />
      </div>
    </div>
  )
}
