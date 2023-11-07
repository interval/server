import { z } from 'zod'
import {
  createRouter,
  authenticatedMiddleware,
  organizationMiddleware,
} from './util'
import { TRPCError } from '@trpc/server'

export const actionGroupRouter = createRouter()
  .middleware(authenticatedMiddleware)
  .middleware(organizationMiddleware)
  .query('one', {
    input: z.object({
      groupSlug: z.string(),
      mode: z.enum(['live', 'console']).default('live'),
    }),
    async resolve({
      ctx: { prisma, user, organizationId, organizationEnvironmentId },
      input: { groupSlug, mode },
    }) {
      const app = await prisma.actionGroup.findFirst({
        where: {
          slug: groupSlug,
          developerId: mode === 'console' ? user.id : null,
          organizationId,
          organizationEnvironmentId,
        },
      })

      if (!app) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return app
    },
  })
