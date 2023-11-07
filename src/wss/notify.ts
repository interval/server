import { Transaction } from '@prisma/client'
import { NotificationWithDeliveries } from '~/utils/types'
import { logger } from '~/server/utils/logger'

import { connectedClients } from './processVars'

/**
 * This will only work as expected if called from the same server
 * that's hosting the websocket connection for the transaction and client.
 * Be careful when calling if performing horizontal server scaling.
 */
export async function sendNotificationToConnectedClient(
  transaction: Transaction,
  notification: NotificationWithDeliveries
) {
  if (transaction.currentClientId) {
    const client = connectedClients.get(transaction.currentClientId)
    if (client) {
      client.rpc
        .send('NOTIFY', {
          transactionId: transaction.id,
          message: notification.message,
          title: notification.title ?? undefined,
          deliveries: notification.notificationDeliveries.map(delivery => ({
            to: delivery.to ?? undefined,
            method: delivery.method ?? undefined,
          })),
        })
        .catch(error => {
          logger.error('Failed sending notify call to client', {
            transactionId: transaction.id,
            error,
          })
        })
      return
    }
  }

  logger.warn('No client to send notify call to', {
    transactionId: transaction.id,
  })
}
