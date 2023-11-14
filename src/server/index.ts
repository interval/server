import path from 'path'
import fs from 'fs'
import express, { Router } from 'express'
import authRouter from './api/auth'
import actionsRouter from './api/actions'
import notifyRouter from './api/notify'
import hostsRouter from './api/hosts'
import workosWebhooksRouter from './api/workosWebhooks'
import trpcRouter from './trpc'
import healthCheckRouter from './healthCheck'
import requestLogger from './middleware/requestLogger'
import { clearDomainlessCookie, sessionMiddleware } from './auth'
import '~/env'

const bundledIndexFilePath = path.join(__dirname, '../../client/index.html')

const isBundled = fs.existsSync(bundledIndexFilePath)

const isProduction = process.env.NODE_ENV === 'production'

const router = Router()
router.use(requestLogger)

router.use(express.json())

// WorkOS Webhooks expect express.json()
router.use('/api/webhooks/workos', workosWebhooksRouter)

router.use(sessionMiddleware)
router.use(clearDomainlessCookie)

router.use('/health-check', healthCheckRouter)

router.use('/api/auth', authRouter)
router.use('/api/trpc', trpcRouter)
router.use('/api/actions', actionsRouter)
router.use('/api/notify', notifyRouter)
router.use('/api/hosts', hostsRouter)

router.get('/api/system/reboot', (_req, res) => {
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
    router.use(
      `/${asset}`,
      express.static(path.join(__dirname, `../../client/${asset}`))
    )
  }

  // Handle client-side routing, return all requests to the app
  router.get('*', async (_, response) => {
    response.sendFile(bundledIndexFilePath)
  })
}

export default router
