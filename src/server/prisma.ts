import { PrismaClient } from '@prisma/client'
import { logger } from './utils/logger'
import env from '~/env'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

const prisma =
  global.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
  })

try {
  //@ts-ignore undocumented prisma field
  const dbUrlString: string = prisma._engine.config.overrideDatasources.db.url
  const dbUrl = new URL(dbUrlString)
  logger.info(`[Prisma] Connecting to database as user: ${dbUrl.username}`)
  if (dbUrl.host.includes('interval2-prod-do-user-860008')) {
    logger.info(`[Prisma] 🚨 Connecting to prod DB 🚨`)
  }
} catch (e) {
  logger.info('Failed to determine Prisma URL')
}

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

export default prisma
