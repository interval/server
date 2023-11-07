import { Router } from 'express'
import { WebSocket } from 'ws'
import prisma from './prisma'
import env from 'env'

const router = Router()

router.get('/app', function (req, res) {
  res.set('Cache-Control', 'no-store')
  res.send('OK')
})

router.get('/rev', function (req, res) {
  res.set('Cache-Control', 'no-store')
  res.send(env.GIT_COMMIT)
})

router.get('/db', async function (req, res) {
  const userCount = await prisma.user.count()
  res.set('Cache-Control', 'no-store')
  res.send(userCount > 0 ? 'OK' : 'KO')
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
