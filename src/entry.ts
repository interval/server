#!/usr/bin/env node
/* eslint-env node */
import { Command } from 'commander'
import dotenv from 'dotenv'
import express from 'express'
import http from 'http'
import {
  SpawnOptionsWithoutStdio,
  spawn,
} from 'child_process'
import { WebSocketServer } from 'ws'

import { logger } from './server/utils/logger'
// import envVars from './env'
import path from 'path'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

// __dirname
// Dev: /Users/alex/dev/interval/server/dist/src
// Release: /Users/alex/.nvm/versions/node/v18.18.1/lib/node_modules/interval-server/dist/src

const projectRootDir = path.resolve(__dirname, '..', '..')

function child(
  cmd: string,
  args: string[],
  opts?: { silent?: boolean } & SpawnOptionsWithoutStdio
) {
  return new Promise<number>((resolve, reject) => {
    const proc = spawn(cmd, args, opts)

    proc.stdout.setEncoding('utf-8')
    proc.stderr.setEncoding('utf-8')

    proc.stdout.on('data', data => {
      if (opts?.silent) return
      logger.info(data.trim())
    })

    proc.stderr.on('data', data => {
      if (opts?.silent) return
      logger.error(data.trim())
    })

    proc.on('close', code => {
      if (code === null) {
        return reject(-1)
      }
      if (code > 0) {
        return reject(code)
      }
      return resolve(0)
    })
  })
}

const initSql = `
  CREATE OR REPLACE FUNCTION nanoid(size int DEFAULT 21)
  RETURNS text AS $$
  DECLARE
    id text := '';
    i int := 0;
    urlAlphabet char(64) := 'ModuleSymbhasOwnPr-0123456789ABCDEFGHNRVfgctiUvz_KqYTJkLxpZXIjQW';
    bytes bytea := gen_random_bytes(size);
    byte int;
    pos int;
  BEGIN
    WHILE i < size LOOP
      byte := get_byte(bytes, i);
      pos := (byte & 63) + 1; -- + 1 because substr starts at 1 for some reason
      id := id || substr(urlAlphabet, pos, 1);
      i = i + 1;
    END LOOP;
    RETURN id;
  END
  $$ LANGUAGE PLPGSQL STABLE;
`

function loadDbUrlEnvVar() {
  try {
    dotenv.config()
  } catch (err) {
    console.error('Failed loading .env', err)
  }

  // only parse the the db URL so that this command can be run without other env vars being set.
  try {
    return z.object({ DATABASE_URL: z.string() }).parse(process.env)
  } catch (e) {
    return null
  }
}

async function setupDb() {
  const envVars = loadDbUrlEnvVar()
  if (!envVars) {
    logger.error(`No DATABASE_URL environment variable was set.`)
    process.exit(1)
  }

  const prisma = new PrismaClient({ datasourceUrl: envVars.DATABASE_URL })

  await Promise.all([
    prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pgcrypto;'),
    prisma.$executeRawUnsafe(initSql),
    child('npx', ['-y', 'prisma', 'db', 'push'], { cwd: projectRootDir }),
  ])
}

const program = new Command()

program.showHelpAfterError()

program
  .name('interval-server')
  .description('Interval Server is the central server for Interval apps')
  .option('-v, --verbose', 'verbose output')
  .addCommand(new Command('start').description('starts Interval Server'))

const [cmd] = program.parse().args
async function main() {
  if (cmd === 'start') {
    const envVars = (await import('./env')).default

    await setupDb()

    // start the internal web socket server
    import('./wss/index')

    const app = express()

    const mainAppServer = (await import('./server/index')).default

    app.use(mainAppServer)

    const server = http.createServer(app)

    const wss = new WebSocketServer({ server, path: '/websocket' })
    const { setupWebSocketServer } = await import('./wss/wss')
    setupWebSocketServer(wss)

    server.listen(Number(envVars.PORT), () => {
      logger.info(
        `📡 Interval Server listening at ${envVars.APP_URL}`
      )
      logger.info(
        `💡 Connect SDK using endpoint: wss://${new URL(envVars.APP_URL).host}/websocket`
      )
    })
  }
}

main()
