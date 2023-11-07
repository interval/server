import emailSender from '../sender'
import { NotificationResult } from '../notification'

type ActionNotificationMetadata = {
  orgSlug: string
  actionName: string
  transactionId: string
  actionRunner: string
  createdAt: string
}

export type ActionNotificationTemplateProps = {
  message: string
  title?: string
  metadata: ActionNotificationMetadata
  failedDetails: NotificationResult[]
}

export default emailSender<ActionNotificationTemplateProps>(
  'action-notification',
  props =>
    `Interval notification: ${props.title || '' + props.metadata.actionName}`
)
