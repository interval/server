#!/usr/bin/env node

/* eslint-env node */

import { Command, Argument } from 'commander'
import { logger } from './server/utils/logger'

const program = new Command()

program.showHelpAfterError()

program
  .name('interval-server')
  .description('Interval Server is the central server for Interval apps')
  .option('-v, --verbose', 'verbose output')
  .addArgument(
    new Argument('<services>', 'services to run').choices([
      'all',
      'server',
      'wss',
    ])
  )

const cmd = program.parse()

const service = cmd.args[0]

if (service === 'all') {
  logger.warn(
    'Running all services in a single process. This is not recommended for production deployments.'
  )
}

if (service === 'all' || service === 'server') {
  import('./server/index')
}
if (service === 'all' || service === 'wss') {
  import('./wss/index')
}
