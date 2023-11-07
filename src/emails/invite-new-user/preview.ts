import sendTemplate from '.'

export default sendTemplate(
  'accounts@interval.com',
  {
    organizationName: 'Interval',
    signupUrl: 'http://localhost:3000/accept-invitation?token=abcd',
    preheader: "You've been invited to join Foo Corp on Interval.",
  },
  { preview: true }
)
