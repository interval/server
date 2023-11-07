import { TransactionResultStatus } from '@prisma/client'

export function completionTitle(resultStatus: TransactionResultStatus): string {
  switch (resultStatus) {
    case 'SUCCESS':
    case 'REDIRECTED':
      return 'Transaction completed: Success ✅'
    case 'FAILURE':
      return 'Transaction completed: Failure ❌'
    case 'CANCELED':
      return 'Transaction canceled.'
  }
}

export function completionMessage(
  resultStatus: TransactionResultStatus,
  actionName = 'An action'
): string {
  switch (resultStatus) {
    case 'SUCCESS':
    case 'REDIRECTED':
      return `${actionName} has completed successfully, see the transaction history for more information.`
    case 'FAILURE':
      return `${actionName} has failed, see the transaction history for more information.`
    case 'CANCELED':
      return `A transaction for ${actionName} has been canceled.`
  }
}
