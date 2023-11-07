import { useEffect, useContext, useMemo } from 'react'
import { trpc } from '~/utils/trpc'
import IVDialog from '~/components/IVDialog'
import TransactionUI, { ActionModeContext } from '../..'
import useTransaction from '../../useTransaction'
import { DialogStateReturn } from 'reakit/ts'

export interface InlineActionProps {
  dialog: DialogStateReturn
  actionKey: string | null
  parent: {
    type: 'Action' | 'ActionGroup'
    id: string
    hostInstanceId: string
  }
}

export default function InlineAction({
  dialog,
  actionKey,
  parent,
}: InlineActionProps) {
  const mode = useContext(ActionModeContext)
  const newTransaction = trpc.useMutation(['transaction.add'])

  const { show, hide } = dialog
  const { mutate, reset } = newTransaction
  useEffect(() => {
    if (actionKey) {
      mutate({
        environment: mode === 'live' ? 'PRODUCTION' : 'DEVELOPMENT',
        actionSlug: actionKey,
        parent: {
          id: parent.id,
          type: parent.type,
          hostInstanceId: parent.hostInstanceId,
        },
      })
    }
  }, [
    actionKey,
    mode,
    mutate,
    reset,
    show,
    hide,
    parent.id,
    parent.type,
    parent.hostInstanceId,
  ])

  const props = useTransaction({
    transaction: newTransaction.data ?? null,
    mode,
  })
  const { state, register } = props

  const completeTransaction = trpc.useQuery(
    [
      'transaction.dashboard.show',
      {
        transactionId: newTransaction.data?.id as string,
      },
    ],
    {
      enabled: !!newTransaction.data?.id && state === 'COMPLETED',
    }
  )

  const transaction = useMemo(() => {
    return completeTransaction.data ?? newTransaction.data
  }, [completeTransaction.data, newTransaction.data])

  const status = transaction?.status
  useEffect(() => {
    if (
      !status ||
      status === 'RUNNING' ||
      status === 'PENDING' ||
      status === 'AWAITING_INPUT'
    ) {
      return register()
    }
    // We don't want to rerun this when status changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [register])

  return (
    <IVDialog dialog={dialog} aria-label="Inline Action">
      {transaction && (
        <TransactionUI transaction={transaction} mode={mode} {...props} />
      )}
    </IVDialog>
  )
}
