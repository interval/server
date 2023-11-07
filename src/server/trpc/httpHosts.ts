import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import {
  createRouter,
  authenticatedMiddleware,
  organizationMiddleware,
} from './util'
import { hasPermission } from '~/utils/permissions'
import { checkHttpHost } from '../utils/hosts'
import { logger } from '~/server/utils/logger'

export const httpHostsRouter = createRouter()
  .middleware(authenticatedMiddleware)
  .middleware(organizationMiddleware)
  .query('list', {
    async resolve({ ctx: { prisma, userOrganizationAccess, organizationId } }) {
      if (!hasPermission(userOrganizationAccess, 'READ_PROD_ACTIONS')) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const httpHosts = await prisma.httpHost.findMany({
        where: {
          organizationId,
          deletedAt: null,
        },
      })

      return httpHosts
    },
  })
  .mutation('add', {
    input: z.object({
      url: z.string().url(),
    }),
    async resolve({
      ctx: { prisma, userOrganizationAccess, organizationId },
      input: { url },
    }) {
      if (!hasPermission(userOrganizationAccess, 'WRITE_PROD_ACTIONS')) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      let created = false

      let httpHost = await prisma.httpHost.findUnique({
        where: {
          organizationId_url: {
            organizationId,
            url,
          },
        },
      })

      if (httpHost) {
        if (httpHost.deletedAt) {
          httpHost = await prisma.httpHost.update({
            where: {
              id: httpHost.id,
            },
            data: {
              deletedAt: null,
            },
          })
        } else {
          throw new TRPCError({ code: 'BAD_REQUEST' })
        }
      } else {
        try {
          httpHost = await prisma.httpHost.create({
            data: {
              status: 'OFFLINE',
              organization: { connect: { id: organizationId } },
              url,
            },
          })
          created = true
        } catch (error) {
          logger.error('Failed to create HttpHost', { error })
        }
      }

      if (!httpHost) {
        console.error('Failed to create/find HttpHost??', {
          organizationId,
          url,
        })
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      }

      httpHost = await checkHttpHost(httpHost)

      if (httpHost.status === 'UNREACHABLE') {
        // Host was unreachable/invalid, don't add it

        let deleted = false
        if (created) {
          try {
            // We should be able to actually delete here
            await prisma.httpHost.delete({
              where: {
                id: httpHost.id,
              },
            })
            deleted = true
          } catch (err) {
            console.error(
              'Failed to delete httpHostId',
              httpHost.id,
              'will soft delete'
            )
          }
        }

        if (!deleted) {
          await prisma.httpHost.update({
            where: {
              id: httpHost.id,
            },
            data: {
              deletedAt: new Date(),
            },
          })
        }

        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return httpHost
    },
  })
  .mutation('delete', {
    input: z.object({
      id: z.string(),
    }),
    async resolve({
      ctx: { prisma, userOrganizationAccess, organizationId },
      input: { id },
    }) {
      if (!hasPermission(userOrganizationAccess, 'WRITE_PROD_ACTIONS')) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const httpHost = await prisma.httpHost.findUnique({
        where: {
          id,
        },
      })

      if (
        !httpHost ||
        httpHost.organizationId !== organizationId ||
        httpHost.deletedAt
      ) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return await prisma.httpHost.update({
        where: {
          id,
        },
        data: {
          status: 'OFFLINE',
          deletedAt: new Date(),
        },
      })
    },
  })
  .mutation('check', {
    input: z.object({
      id: z.string(),
    }),
    async resolve({
      ctx: { prisma, userOrganizationAccess, organizationId },
      input: { id },
    }) {
      if (!hasPermission(userOrganizationAccess, 'READ_PROD_ACTIONS')) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const httpHost = await prisma.httpHost.findUnique({
        where: {
          id,
        },
      })

      if (
        !httpHost ||
        httpHost.organizationId !== organizationId ||
        httpHost.deletedAt
      ) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return await checkHttpHost(httpHost)
    },
  })
