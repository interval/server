import { useLocation, useParams, Navigate } from 'react-router-dom'
import { trpc, inferMutationOutput } from '~/utils/trpc'
import { useHasPermission } from '~/components/DashboardContext'
import IVSpinner from '~/components/IVSpinner'
import TransactionLayout from '~/components/TransactionUI/_presentation/TransactionLayout'
import PageLayout from '~/components/PageLayout'

/**
 * This is only for production transactions.
 */
export default function TransactionPage() {
  const location = useLocation()
  const state = location.state as
    | { transaction?: inferMutationOutput<'transaction.add'> }
    | undefined
  const { transactionId } = useParams<{ transactionId: string }>()
  const canRunActions = useHasPermission('RUN_PROD_ACTIONS')
  const canViewTransactions = useHasPermission('READ_PROD_TRANSACTIONS')

  const { data } = trpc.useQuery(
    ['transaction.dashboard.show', { transactionId: transactionId as string }],
    {
      initialData: state?.transaction,
      initialDataUpdatedAt: state?.transaction?.updatedAt.getTime(),
    }
  )

  if (!data) {
    return <IVSpinner fullPage delayDuration={100} />
  }

  if (
    (data.status === 'COMPLETED' && canViewTransactions === false) ||
    (data.status !== 'COMPLETED' && canRunActions === false)
  ) {
    return <Navigate to=".." />
  }

  return (
    <PageLayout mode="live">
      <TransactionLayout transaction={data ?? null} mode="live" />
    </PageLayout>
  )
}
