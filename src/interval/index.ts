import path from 'path'
import { Interval } from '@interval/sdk'
import env from '../env'

if (!env.INTERVAL_KEY) {
  throw new Error(
    'Environment variable INTERVAL_KEY required for internal actions.'
  )
}

const interval = new Interval({
  endpoint: `${env.APP_URL}/websocket`,
  apiKey: env.INTERVAL_KEY,
  routesDirectory: path.resolve(__dirname, 'routes'),
})

interval.listen()
