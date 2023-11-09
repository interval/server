import path from 'path'
import fs from 'fs'
import express from 'express'
import authRouter from './api/auth'
import actionsRouter from './api/actions'
import notifyRouter from './api/notify'
import hostsRouter from './api/hosts'
import workosWebhooksRouter from './api/workosWebhooks'
import trpcRouter from './trpc'
import healthCheckRouter from './healthCheck'
import requestLogger from './middleware/requestLogger'
import { clearDomainlessCookie, sessionMiddleware } from './auth'
import env from '~/env'

import { logger } from './utils/logger'

const bundledIndexFilePath = path.join(__dirname, '../../client/index.html')

const isBundled = fs.existsSync(bundledIndexFilePath)

const isProduction = process.env.NODE_ENV === 'production'

const port = isBundled ? 3000 : 3001

const app = express()
app.use(requestLogger)

app.use(express.json())

// WorkOS Webhooks expect express.json()
app.use('/api/webhooks/workos', workosWebhooksRouter)

app.use(sessionMiddleware)
app.use(clearDomainlessCookie)

app.use('/health-check', healthCheckRouter)

app.use('/api/auth', authRouter)
app.use('/api/trpc', trpcRouter)
app.use('/api/actions', actionsRouter)
app.use('/api/notify', notifyRouter)
app.use('/api/hosts', hostsRouter)

app.get('/api/system/reboot', (_req, res) => {
  if (isProduction) res.sendStatus(404)
  const pathname = path.join(__dirname, './index.ts')
  fs.utimesSync(pathname, new Date(), new Date())
  res.sendStatus(200)
})

if (isBundled) {
  const assets = [
    'app-assets',
    'favicon.png',
    'open-graph-twitter-1600w.png',
    'open-graph.png',
    'app.webmanifest',
  ]

  for (const asset of assets) {
    app.use(
      `/${asset}`,
      express.static(path.join(__dirname, `../../client/${asset}`))
    )
  }

  // Handle client-side routing, return all requests to the app
  app.get('*', async (_, response) => {
    response.sendFile(bundledIndexFilePath)
  })
}

app.listen(port, () => {
  const url = new URL(env.APP_URL)
  url.port = port.toString()
  logger.info(`📡 API server listening at ${url.toString()}`)
  logger.info(`🌎 Interval client ready at ${env.APP_URL}`)
})
