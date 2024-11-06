import { Router } from 'express'
import { WebSocket } from 'ws'
import prisma from './prisma'
import env from '~/env'
import { makeApiCall } from './utils/wss'

const router = Router()

router.get('/app', function (req, res) {
  res.set('Cache-Control', 'no-store')
  res.send('OK')
})

router.get('/rev', function (req, res) {
  res.set('Cache-Control', 'no-store')
  res.send(env.GIT_COMMIT)
})

router.get('/', async function (req, res) {
  const [userQuery, wssQuery] = await Promise.all([
    prisma.user.count({ take: 1 }).catch(() => null),
    makeApiCall('/api/health', '').catch(() => null),
  ])

  const dbStatus = userQuery === null ? 'down' : 'up'
  const internalWssStatus = wssQuery === null ? 'down' : 'up'
  const appStatus = dbStatus !== 'up' || internalWssStatus !== 'up' ? 'down' : 'up'

  return res.status(appStatus === 'up' ? 200 : 503).json({
    status: appStatus === 'up' ? 'ok' : 'error',
    info: {
      db: {
        status: dbStatus,
      },
      app: {
        status: appStatus,
      },
      internalWss: {
        status: internalWssStatus,
      },
    },
    error: {
      app: null,
      db: userQuery === null ? 'user count query failed' : null,
      internalWss: wssQuery === null ? 'internal wss query failed' : null,
    },
  })
})

router.get('/wss', function (req, res) {
  res.set('Cache-Control', 'no-store')

  const ws = new WebSocket('ws://localhost:3002')

  ws.onopen = () => {
    res.send('OK')
  }
  ws.onerror = () => {
    res.sendStatus(500)
  }
})

export default router
