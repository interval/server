import emailSender from '../sender'
import { NotificationMethod } from '@prisma/client'

export interface NotificationResult {
  method?: NotificationMethod
  to: string
  error?: string
}

export type NotificationMetadata = {
  orgSlug: string
  createdAt: string
}

export type NotificationTemplateProps = {
  message: string
  title?: string
  metadata: NotificationMetadata
  failedDetails: NotificationResult[]
}

export default emailSender<NotificationTemplateProps>(
  'notification',
  props => `Interval notification: ${props.title || '' + props.message}`
)
