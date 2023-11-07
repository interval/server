import emailSender from '../sender'

export type InviteNewUserTemplateProps = {
  organizationName: string
  signupUrl: string
  preheader: string
}

export default emailSender<InviteNewUserTemplateProps>(
  'invite-new-user',
  props => `${props.organizationName} has invited you to join them on Interval`
)
