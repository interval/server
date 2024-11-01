import { z } from 'zod'
import { UsageEnvironment } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import {
  createRouter,
  authenticatedMiddleware,
  organizationMiddleware,
} from './util'
import { encryptPassword, generateKey } from '~/server/auth'
import { hasPermission } from '~/utils/permissions'
import { getDevKey } from '~/server/utils/apiKey'
import { DEVELOPMENT_ORG_ENV_SLUG } from '~/utils/environments'
import env from '~/env'
import { isEmailEnabled } from '../utils/email'

export const keyRouter = createRouter()
  .middleware(authenticatedMiddleware)
  .middleware(organizationMiddleware)
  .query('prod', {
    input: z.object({
      organizationId: z.string().optional(),
      organizationSlug: z.string().optional(),
    }),
    async resolve({ ctx: { prisma, user, organizationId }, input }) {
      return prisma.apiKey.findMany({
        where: {
          userId: user.id,
          organization: {
            id: input?.organizationId || organizationId,
            slug: input?.organizationSlug,
          },
          deletedAt: null,
          usageEnvironment: 'PRODUCTION',
        },
        select: {
          id: true,
          usageEnvironment: true,
          createdAt: true,
          deletedAt: true,
          label: true,
          organization: true,
          organizationEnvironment: true,
          hostInstances: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    },
  })
  .mutation('add', {
    input: z.object({
      label: z.string().optional(),
      usageEnvironment: z.nativeEnum(UsageEnvironment),
      organizationEnvironmentId: z.string(),
    }),
    async resolve({
      ctx: { prisma, user, organizationId, userOrganizationAccess },
      input: { label, usageEnvironment, organizationEnvironmentId },
    }) {
      const requiredPermission =
        usageEnvironment === 'PRODUCTION'
          ? 'CREATE_PROD_API_KEYS'
          : 'CREATE_DEV_API_KEYS'

      if (!hasPermission(userOrganizationAccess, requiredPermission)) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      if (isEmailEnabled()) {
        const pendingConfirmation =
          await prisma.userEmailConfirmToken.findFirst({
            where: { userId: user.id, email: null },
          })
        if (pendingConfirmation) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Must confirm your email to create live keys',
          })
        }
      }

      const token = generateKey(user, usageEnvironment)

      const organizationEnvironment =
        await prisma.organizationEnvironment.findUnique({
          where: {
            id: organizationEnvironmentId,
          },
        })

      if (!organizationEnvironment) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const key = await prisma.apiKey.create({
        data: {
          key:
            usageEnvironment === 'PRODUCTION' ? encryptPassword(token) : token,
          label,
          usageEnvironment,
          organizationEnvironment: {
            connect: {
              id: organizationEnvironmentId,
            },
          },
          user: {
            connect: {
              id: user.id,
            },
          },
          organization: {
            connect: {
              id: organizationId,
            },
          },
        },
      })

      if (!key) {
        // Organization doesn't exist, or I guess random key happened to already exist
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return {
        key,
        token,
      }
    },
  })
  // For development key
  .mutation('regenerate', {
    async resolve({
      ctx: {
        prisma,
        user,
        organizationId,
        userOrganizationAccess,
        organization,
      },
    }) {
      if (!hasPermission(userOrganizationAccess, 'CREATE_DEV_API_KEYS')) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const devEnv = organization.environments.find(
        env => env.slug === DEVELOPMENT_ORG_ENV_SLUG
      )

      if (!devEnv) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      await prisma.apiKey.updateMany({
        where: {
          userId: user.id,
          organizationId,
          usageEnvironment: 'DEVELOPMENT',
        },
        data: {
          deletedAt: new Date(),
        },
      })

      const key = await prisma.apiKey.create({
        data: {
          key: generateKey(user, 'DEVELOPMENT'),
          usageEnvironment: 'DEVELOPMENT',
          organizationEnvironment: {
            connect: {
              id: devEnv.id,
            },
          },
          user: {
            connect: {
              id: user.id,
            },
          },
          organization: {
            connect: {
              id: organizationId,
            },
          },
        },
      })

      if (!key) {
        // Organization doesn't exist, or I guess random key happened to already exist
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return key
    },
  })
  .query('dev', {
    async resolve({ ctx: { user, organizationId, userOrganizationAccess } }) {
      return getDevKey({
        user,
        organizationId,
        userOrganizationAccess,
      })
    },
  })
  .mutation('delete', {
    input: z.object({
      id: z.string(),
    }),
    async resolve({
      ctx: { prisma, user, userOrganizationAccess },
      input: { id },
    }) {
      const key = await prisma.apiKey.findUnique({
        where: {
          id,
        },
      })

      if (
        !key ||
        key.deletedAt ||
        (key.userId !== user.id &&
          !hasPermission(userOrganizationAccess, 'DELETE_ORG_USER_API_KEYS'))
      ) {
        return new TRPCError({ code: 'NOT_FOUND' })
      }

      return prisma.apiKey.update({
        where: {
          id,
        },
        data: {
          deletedAt: new Date(),
        },
      })
    },
  })
