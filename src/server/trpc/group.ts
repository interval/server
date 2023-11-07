import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import {
  createRouter,
  authenticatedMiddleware,
  organizationMiddleware,
} from './util'
import { hasPermission } from '~/utils/permissions'
import { generateSlug, getCollisionSafeSlug } from '~/server/utils/slugs'

export const groupRouter = createRouter()
  .middleware(authenticatedMiddleware)
  .middleware(organizationMiddleware)
  .query('list', {
    input: z
      .object({
        actionId: z.string().optional(),
      })
      .optional()
      .default({}),
    async resolve({ ctx: { prisma, organizationId }, input: { actionId } }) {
      return prisma.userAccessGroup.findMany({
        where: {
          organizationId,
        },
        include: {
          actionAccesses: actionId
            ? {
                where: {
                  actionMetadata: {
                    actionId,
                  },
                },
              }
            : undefined,
          _count: {
            select: {
              memberships: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      })
    },
  })
  .query('one', {
    input: z.object({
      id: z.string(),
    }),
    async resolve({ ctx: { prisma, organizationId }, input: { id } }) {
      const group = await prisma.userAccessGroup.findFirst({
        where: {
          id,
          organizationId,
        },
        include: {
          actionAccesses: {
            include: {
              actionMetadata: {
                include: {
                  action: true,
                },
              },
            },
          },
        },
      })

      if (!group) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return group
    },
  })
  .mutation('add', {
    input: z.object({
      data: z.object({
        name: z.string(),
      }),
    }),
    async resolve({
      ctx: { prisma, userOrganizationAccess, organizationId },
      input: { data },
    }) {
      if (!hasPermission(userOrganizationAccess, 'WRITE_USERS')) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const desiredSlug = generateSlug(data.name)

      const existingSlugs = await prisma.userAccessGroup.findMany({
        where: {
          organizationId,
          slug: {
            startsWith: desiredSlug,
          },
        },
        select: { slug: true },
      })

      const slug = getCollisionSafeSlug(
        desiredSlug,
        existingSlugs.map(t => String(t.slug))
      )

      return prisma.userAccessGroup.create({
        data: {
          ...data,
          slug,
          organization: { connect: { id: organizationId } },
        },
      })
    },
  })
  .mutation('edit', {
    input: z.object({
      id: z.string(),
      data: z.object({
        name: z.string().optional(),
      }),
    }),
    async resolve({
      ctx: { prisma, userOrganizationAccess, organizationId },
      input: { id, data },
    }) {
      if (!hasPermission(userOrganizationAccess, 'WRITE_USERS')) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const group = await prisma.userAccessGroup.findUnique({
        where: { id },
      })

      if (!group) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      if (group.scimGroupId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This team uses SCIM sync and cannot be edited manually.',
        })
      }

      return prisma.userAccessGroup.update({
        where: { id },
        data: {
          ...data,
          organization: { connect: { id: organizationId } },
        },
      })
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
      if (!hasPermission(userOrganizationAccess, 'WRITE_USERS')) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const group = await prisma.userAccessGroup.findFirst({
        where: {
          id,
          organizationId,
        },
      })

      if (!group) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      if (group.scimGroupId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This team uses SCIM sync and cannot be edited manually.',
        })
      }

      const [, , deletedGroup] = await prisma.$transaction([
        prisma.userAccessGroupMembership.deleteMany({
          where: {
            groupId: id,
          },
        }),

        prisma.actionAccess.deleteMany({
          where: {
            userAccessGroupId: id,
          },
        }),

        prisma.userAccessGroup.delete({
          where: { id },
        }),
      ])

      return deletedGroup
    },
  })
  .mutation('users.add', {
    input: z.object({
      groupId: z.string(),
      userOrganizationAccessId: z.string(),
    }),
    async resolve({
      ctx: { prisma, userOrganizationAccess, organizationId },
      input: { groupId, userOrganizationAccessId },
    }) {
      if (!hasPermission(userOrganizationAccess, 'WRITE_USERS')) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const group = await prisma.userAccessGroup.findFirst({
        where: {
          id: groupId,
          organizationId,
        },
      })

      if (!group) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      if (group.scimGroupId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This team uses SCIM sync and cannot be edited manually.',
        })
      }

      const userAccess = await prisma.userOrganizationAccess.findUnique({
        where: {
          id: userOrganizationAccessId,
        },
      })

      if (!userAccess || userAccess.organizationId !== organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return prisma.userAccessGroupMembership.create({
        data: {
          userOrganizationAccess: { connect: { id: userOrganizationAccessId } },
          group: { connect: { id: groupId } },
        },
      })
    },
  })
  .mutation('users.remove', {
    input: z.object({
      groupId: z.string(),
      userOrganizationAccessId: z.string(),
    }),
    async resolve({
      ctx: { prisma, userOrganizationAccess, organizationId },
      input: { groupId, userOrganizationAccessId },
    }) {
      if (!hasPermission(userOrganizationAccess, 'WRITE_USERS')) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const membership = await prisma.userAccessGroupMembership.findUnique({
        where: {
          userOrganizationAccessId_groupId: {
            userOrganizationAccessId,
            groupId,
          },
        },
        include: {
          group: true,
        },
      })

      if (!membership || membership.group.organizationId !== organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      if (membership.group.scimGroupId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This team uses SCIM sync and cannot be edited manually.',
        })
      }

      return prisma.userAccessGroupMembership.delete({
        where: {
          userOrganizationAccessId_groupId: {
            userOrganizationAccessId,
            groupId,
          },
        },
      })
    },
  })
