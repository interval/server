import sendTemplate from '.'

export default sendTemplate(
  'alex@interval.com',
  {
    resetUrl: 'https://interval.com/reset-password?seal=seal123',
  },
  { preview: true }
)
