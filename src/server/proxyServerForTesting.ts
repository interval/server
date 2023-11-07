/**
 * This emulates the development proxy setup to facilitate testing the
 * compiled JavaScript code in a non-production environment.
 */

import http from 'http'
import httpProxy from 'http-proxy'
import '.'
import '../wss'
import { logger } from './utils/logger'

if (process.env.NODE_ENV !== 'production') {
  const proxy = httpProxy.createProxyServer({})

  const server = http.createServer((req, res) => {
    if (!req.url) return

    proxy.web(
      req,
      res,
      {
        target: 'http://localhost:3001',
      },
      err => {
        logger.error('Failed proxying', err)
        res.end()
      }
    )
  })

  server.on('upgrade', (req, socket, head) => {
    proxy.ws(req, socket, head, {
      target: 'ws://localhost:3002',
    })
  })

  server.listen(3000)
}
