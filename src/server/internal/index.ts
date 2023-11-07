// an interval app inside interval 🌌 🧠

import IntervalBeta from '@interval/sdk-latest/dist/experimental'
import env from 'env'
import path from 'path'

export const interval = new IntervalBeta({
  logLevel: 'debug',
  apiKey: env.INTERNAL_TOOLS_API_KEY,
  endpoint: env.INTERNAL_TOOLS_ENDPOINT,
  routesDirectory: path.resolve(__dirname, 'actions'),
})
