import Dialog, { useDialogState } from '~/components/IVDialog'
import { trpc } from '~/utils/trpc'
import IVButton from '~/components/IVButton'
import { notify } from '../NotificationCenter'

function ArchiveForm({
  actionId,
  onSubmit,
  onClose,
}: {
  actionId: string
  onSubmit: () => void
  onClose: () => void
}) {
  const archive = trpc.useMutation('action.archive')

  return (
    <div>
      <p className="mt-4">Are you sure you want to archive this action?</p>

      <div className="mt-8 flex gap-2">
        <IVButton
          theme="danger"
          label="Archive"
          autoFocus
          onClick={() => {
            archive.mutate({ actionId }, { onSuccess: onSubmit })
          }}
        />
        <IVButton theme="secondary" label="Cancel" onClick={onClose} />
      </div>
    </div>
  )
}

function UnarchiveForm({
  actionId,
  onSubmit,
  onClose,
}: {
  actionId: string
  onSubmit: () => void
  onClose: () => void
}) {
  const unarchive = trpc.useMutation('action.unarchive')

  return (
    <div>
      <p>Unarchive this action to add it to the actions list and run it.</p>

      <div className="mt-8 flex gap-2">
        <IVButton
          theme="primary"
          label="Unarchive"
          autoFocus
          onClick={() => {
            unarchive.mutate({ actionId }, { onSuccess: onSubmit })
          }}
        />
        <IVButton theme="secondary" label="Cancel" onClick={onClose} />
      </div>
    </div>
  )
}

export default function ArchiveDialog({
  actionId,
  dialog,
  onSuccess,
  mode,
}: {
  actionId: string
  mode: 'archive' | 'unarchive'
  onSuccess: () => void
  dialog: ReturnType<typeof useDialogState>
}) {
  return (
    <Dialog
      dialog={dialog}
      title={mode === 'archive' ? 'Archive action' : 'Unarchive action'}
    >
      {mode === 'archive' && (
        <ArchiveForm
          actionId={actionId}
          onSubmit={() => {
            dialog.hide()
            notify.success(() => (
              <div>
                <p className="font-medium">Action archived.</p>
                <p>Please remove it from your deployment.</p>
              </div>
            ))
            onSuccess()
          }}
          onClose={dialog.hide}
        />
      )}
      {mode === 'unarchive' && (
        <UnarchiveForm
          actionId={actionId}
          onSubmit={() => {
            dialog.hide()
            notify.success('Action unarchived.')
            onSuccess()
          }}
          onClose={dialog.hide}
        />
      )}
    </Dialog>
  )
}
