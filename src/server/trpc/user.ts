import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { UserAccessPermission, NotificationMethod } from '@prisma/client'
import {
  createRouter,
  authenticatedMiddleware,
  organizationMiddleware,
} from './util'
import { generatePassword, requestEmailConfirmation } from '~/server/auth'
import { createUser } from '~/server/user'
import { hasPermission } from '~/utils/permissions'
import { logger } from '~/server/utils/logger'

export const userRouter = createRouter()
  .middleware(authenticatedMiddleware)
  .query('me', {
    input: z
      .object({
        timeZoneName: z.string().optional(),
      })
      .optional(),
    async resolve({ ctx, input }) {
      const user = await ctx.prisma.user.findUnique({
        where: {
          id: ctx.user.id,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          defaultNotificationMethod: true,
          timeZoneName: true,
          userOrganizationAccess: {
            where: {
              organization: {
                deletedAt: null,
              },
            },
            orderBy: {
              lastSwitchedToAt: 'desc',
            },
            include: {
              organization: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  ownerId: true,
                  requireMfa: true,
                },
              },
              groupMemberships: {
                include: {
                  group: {
                    select: {
                      id: true,
                      slug: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      if (user && !user.timeZoneName && input?.timeZoneName) {
        try {
          await ctx.prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              timeZoneName: input.timeZoneName,
            },
          })
          user.timeZoneName = input.timeZoneName
        } catch (err) {
          logger.error('Failed updating time zone', {
            userId: user.id,
            timeZoneName: input.timeZoneName,
          })
        }
      }

      const pendingConfirmation =
        await ctx.prisma.userEmailConfirmToken.findFirst({
          // a confirmation with `email` as null will be a first-time confirmation.
          // completing this step is required before certain operations can be performed
          where: { userId: ctx.user.id, email: null },
        })

      return user
        ? {
            ...user,
            isEmailConfirmationRequired: !!pendingConfirmation,
          }
        : null
    },
  })
  .mutation('edit', {
    input: z.object({
      id: z.string(),
      data: z.object({
        email: z.string().email().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        defaultNotificationMethod: z.nativeEnum(NotificationMethod).optional(),
        timeZoneName: z.string().nullish(),
      }),
    }),
    async resolve({ ctx: { prisma, user }, input: { id, data } }) {
      if (user.id !== id) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const { email: newEmail, ...rest } = data

      let requiresEmailConfirmation = false

      if (newEmail !== user.email) {
        const existingUser = await prisma.user.findFirst({
          where: { email: newEmail },
        })

        if (existingUser) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Sorry, that email is already in use.',
          })
        }

        await requestEmailConfirmation(user, newEmail)
        requiresEmailConfirmation = true
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: rest,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      })

      return { updatedUser, requiresEmailConfirmation }
    },
  })
  .middleware(organizationMiddleware)
  .mutation('add', {
    input: z.object({
      email: z.string().email(),
      firstName: z.string(),
      lastName: z.string(),
      organizationId: z.string().optional(),
    }),
    async resolve({
      ctx: { userOrganizationAccess },
      input: { organizationId, ...input },
    }) {
      if (
        organizationId &&
        (userOrganizationAccess.organizationId !== organizationId ||
          !hasPermission(userOrganizationAccess, 'WRITE_USERS'))
      ) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      return createUser({
        data: input,
        password: generatePassword(),
        organization: organizationId
          ? {
              existing: {
                id: organizationId,
                permissions: ['DEVELOPER'],
              },
            }
          : undefined,
      })
    },
  })
  .mutation('edit-role', {
    input: z.object({
      id: z.string(),
      data: z.object({
        orgSlug: z.string(),
        permission: z.nativeEnum(UserAccessPermission),
      }),
    }),
    async resolve({ ctx: { prisma, user }, input: { id, data } }) {
      // this is a debug tool; users can't edit their own roles via this endpoint in production
      if (process.env.NODE_ENV === 'production') {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      if (user.id !== id) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const userOrganizationAccess =
        await prisma.userOrganizationAccess.findFirst({
          where: {
            user: { id },
            organization: {
              slug: data.orgSlug,
            },
          },
        })

      if (!userOrganizationAccess) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const updatedAccess = await prisma.userOrganizationAccess.update({
        where: {
          id: userOrganizationAccess.id,
        },
        data: {
          permissions: [data.permission],
        },
      })

      return updatedAccess
    },
  })
