import emailSender from '../sender'

export type ForgotPasswordTemplateProps = {
  resetUrl: string
}

export default emailSender<ForgotPasswordTemplateProps>(
  'forgot-password',
  () => 'Password reset request',
  { preheader: "We've received a request to reset your password." }
)
