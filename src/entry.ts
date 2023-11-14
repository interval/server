#!/usr/bin/env node
/* eslint-env node */
import { Command } from 'commander'
import express from 'express'
import http from 'http'
import { WebSocketServer } from 'ws'

import { setupWebSocketServer } from './wss/wss'
import './wss/index'
import mainAppServer from './server/index'
import { logger } from './server/utils/logger'
import envVars from './env'

const program = new Command()

program.showHelpAfterError()

program
  .name('interval-server')
  .description('Interval Server is the central server for Interval apps')
  .option('-v, --verbose', 'verbose output')
  .addCommand(new Command('start').description('starts Interval Server'))
  .addCommand(new Command('db-init'))

const [cmd] = program.parse().args

if (cmd === 'start') {
  const app = express()

  app.use(mainAppServer)

  const server = http.createServer(app)

  const wss = new WebSocketServer({ server, path: '/websocket' })
  setupWebSocketServer(wss)

  server.listen(envVars.PORT, () => {
    logger.info(
      `📡 Interval Server listening at http://localhost:${envVars.PORT}`
    )
  })
} else if (cmd === 'db-init') {
  // TODO: Implement db init command
  console.log('Initializing a database...')
}
