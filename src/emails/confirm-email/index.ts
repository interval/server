import emailSender from '../sender'

export type ConfirmEmailTemplateProps = {
  confirmUrl: string
  isEmailChange: boolean
}

export default emailSender<ConfirmEmailTemplateProps>(
  'confirm-email',
  () => `Please confirm your email address on Interval`
)
