import * as trpcExpress from '@trpc/server/adapters/express'
import { transformer } from '~/utils/trpc/utils'
import { actionGroupRouter } from './actionGroup'
import { userRouter } from './user'
import { authRouter } from './auth'
import { organizationRouter } from './organization'
import { keyRouter } from './apiKeys'
import { actionRouter } from './action'
import { createRouter, createContext, authenticatedMiddleware } from './util'
import { transactionRouter } from './transaction'
import { dashboardRouter } from './dashboard'
import { groupRouter } from './group'
import { uploadsRouter } from './uploads'
import { httpHostsRouter } from './httpHosts'
import { environmentsRouter } from './environments'
import { logger } from '~/server/utils/logger'
import env from 'env'

const appRouter = createRouter()
  .transformer(transformer)
  .query('app.commit-rev', {
    async resolve() {
      return env.GIT_COMMIT
    },
  })
  .merge('actionGroup.', actionGroupRouter)
  .merge('auth.', authRouter)
  .merge('user.', userRouter)
  .merge('organization.', organizationRouter)
  .merge('key.', keyRouter)
  .merge('transaction.', transactionRouter)
  .merge('action.', actionRouter)
  .merge('dashboard.', dashboardRouter)
  .merge('group.', groupRouter)
  .merge('uploads.', uploadsRouter)
  .merge('http-hosts.', httpHostsRouter)
  .merge('environments.', environmentsRouter)
  .middleware(authenticatedMiddleware)
  .query('app.node-env', {
    async resolve() {
      return process.env.NODE_ENV
    },
  })

export type AppRouter = typeof appRouter

const trpcRouter = trpcExpress.createExpressMiddleware({
  router: appRouter,
  createContext,
  onError({ error }) {
    if (error.code === 'INTERNAL_SERVER_ERROR') {
      logger.error('Something went wrong', { error })
    }
  },
})

export default trpcRouter
