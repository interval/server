import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import {
  Prisma,
  UsageEnvironment,
  ActionAvailability,
  ActionAccessLevel,
  NotificationMethod,
} from '@prisma/client'
import { hasPermission, SDK_PERMISSIONS_MIN_VERSION } from '~/utils/permissions'
import {
  createRouter,
  authenticatedMiddleware,
  organizationMiddleware,
} from './util'
import { getActionAccessLevel, isBackgroundable } from '~/utils/actions'
import {
  actionMetadataWithAccesses,
  getAllActionGroups,
  getAllActions,
  reconstructActionGroups,
  setActionPermissions,
} from '~/server/utils/actions'
import {
  isInputValid,
  syncActionSchedules,
} from '~/server/utils/actionSchedule'
import { authorizePotentialGhostRequest } from '../utils/ghostMode'
import { ALL_TIMEZONES } from '~/utils/timezones'
import { isFlagEnabled } from '../utils/featureFlags'
import { NODE_SDK_NAME } from '~/utils/isomorphicConsts'
import { logger } from '~/server/utils/logger'

export const actionRouter = createRouter()
  .query('console.index', {
    input: z
      .object({
        slugPrefix: z.string().optional(),
      })
      .default({}),
    async resolve({ ctx, input: { slugPrefix } }) {
      const { userId, organizationId, organizationEnvironmentId } =
        await authorizePotentialGhostRequest(ctx, 'READ_DEV_ACTIONS')

      const [actions, actionGroups, currentPage, hasAnyActions] =
        await Promise.all([
          ctx.prisma.action.findMany({
            where: {
              isInline: false,
              organizationId,
              developerId: userId,
              organizationEnvironmentId,
              slug: slugPrefix
                ? {
                    startsWith: `${slugPrefix}/`,
                  }
                : undefined,
              OR: [
                {
                  hostInstances: {
                    some: {
                      status: {
                        in: ['ONLINE', 'UNREACHABLE'],
                      },
                    },
                  },
                },
                {
                  httpHosts: {
                    some: {
                      status: {
                        in: ['ONLINE', 'UNREACHABLE'],
                      },
                    },
                  },
                },
              ],
            },
            orderBy: {
              slug: 'asc',
            },
            include: {
              hostInstances: {
                where: {
                  status: {
                    in: ['ONLINE', 'UNREACHABLE'],
                  },
                },
                select: { status: true },
                orderBy: { createdAt: 'desc' },
              },
              httpHosts: {
                where: {
                  status: {
                    in: ['ONLINE', 'UNREACHABLE'],
                  },
                },
                select: { status: true },
                orderBy: { createdAt: 'desc' },
              },
              schedules: {
                where: { deletedAt: null },
              },
              ...actionMetadataWithAccesses(userId).include,
            },
          }),
          ctx.prisma.actionGroup.findMany({
            where: {
              organizationId,
              developerId: userId,
              organizationEnvironmentId,
              OR: [
                {
                  hostInstances: {
                    some: {
                      status: {
                        in: ['ONLINE', 'UNREACHABLE'],
                      },
                    },
                  },
                },
                {
                  httpHosts: {
                    some: {
                      status: {
                        in: ['ONLINE', 'UNREACHABLE'],
                      },
                    },
                  },
                },
              ],
            },
            include: {
              hostInstances: {
                where: {
                  status: {
                    in: ['ONLINE', 'UNREACHABLE'],
                  },
                },
                select: { status: true, isInitializing: true },
                orderBy: { createdAt: 'desc' },
              },
              httpHosts: {
                where: {
                  status: {
                    in: ['ONLINE', 'UNREACHABLE'],
                  },
                },
                select: { status: true },
                orderBy: { createdAt: 'desc' },
              },
              ...actionMetadataWithAccesses(userId).include,
            },
            orderBy: {
              slug: 'asc',
            },
          }),
          ctx.prisma.actionGroup.findFirst({
            where: {
              slug: slugPrefix,
              organizationId,
              developerId: userId,
              organizationEnvironmentId,
              OR: [
                {
                  hostInstances: {
                    some: {
                      status: {
                        in: ['ONLINE', 'UNREACHABLE'],
                      },
                    },
                  },
                },
                {
                  httpHosts: {
                    some: {
                      status: {
                        in: ['ONLINE', 'UNREACHABLE'],
                      },
                    },
                  },
                },
              ],
            },
          }),
          ctx.prisma.action
            .findFirst({
              where: {
                isInline: false,
                organizationId,
                developerId: userId,
                organizationEnvironmentId,
              },
            })
            .then(action => {
              return !!action
            }),
        ])

      const onlineActions = actions.filter(
        act =>
          act.hostInstances.some(hi => hi.status === 'ONLINE') ||
          act.httpHosts.some(hh => hh.status === 'ONLINE')
      )

      const queued = await ctx.prisma.queuedAction.findMany({
        where: {
          action: {
            id: {
              in: onlineActions.map(a => a.id),
            },
          },
          AND: [
            {
              OR: [
                {
                  assigneeId: null,
                },
                {
                  assigneeId: userId,
                },
              ],
            },
            {
              OR: [
                {
                  transactionId: null,
                },
                {
                  transaction: {
                    ownerId: userId,
                    status: {
                      in: ['PENDING', 'RUNNING', 'AWAITING_INPUT'],
                    },
                    resultStatus: null,
                  },
                },
              ],
            },
          ],
        },
        include: {
          action: actionMetadataWithAccesses(userId),
          transaction: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return {
        ...reconstructActionGroups({
          slugPrefix,
          actionGroups,
          actions: onlineActions,
          canConfigureActions: true,
          mode: 'console',
        }),
        currentPage,
        queued,
        hasAnyActions,
      }
    },
  })
  .middleware(authenticatedMiddleware)
  .middleware(organizationMiddleware)
  .query('all', {
    input: z
      .object({
        envSlug: z.string().nullish(),
      })
      .optional(),
    async resolve({
      input: { envSlug } = {},
      ctx: {
        prisma,
        user,
        organizationId,
        userOrganizationAccess,
        organizationEnvironmentId,
      },
    }) {
      if (!hasPermission(userOrganizationAccess, 'READ_PROD_ACTIONS')) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      if (envSlug) {
        const orgEnv = await prisma.organizationEnvironment.findFirst({
          where: {
            organizationId,
            slug: envSlug,
          },
        })

        if (!orgEnv) {
          throw new TRPCError({ code: 'NOT_FOUND' })
        }

        organizationEnvironmentId = orgEnv.id
      }

      const allActions = await getAllActions({
        organizationId,
        developerId: null,
        organizationEnvironmentId,
        userId: user.id,
      })

      const actions = allActions.filter(a => !a.metadata?.archivedAt)
      const archivedActions = allActions.filter(a => !!a.metadata?.archivedAt)

      return {
        actions,
        archivedActions,
      }
    },
  })
  .query('one', {
    input: z.object({
      slug: z.string(),
      environment: z.nativeEnum(UsageEnvironment).default('PRODUCTION'),
    }),
    async resolve({
      ctx: {
        prisma,
        user,
        organizationId,
        userOrganizationAccess,
        organizationEnvironmentId,
      },
      input: { slug, environment },
    }) {
      const action = await prisma.action.findFirst({
        where: {
          isInline: false,
          slug,
          organizationId,
          developerId: environment === 'DEVELOPMENT' ? user.id : null,
          organizationEnvironmentId,
        },
        include: {
          organization: {
            include: {
              userOrganizationAccess: {
                where: {
                  userId: user.id,
                },
              },
            },
          },
          schedules: {
            where: {
              deletedAt: null,
            },
            include: {
              runner: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          hostInstances: {
            where: {
              status: {
                in: ['ONLINE', 'UNREACHABLE'],
              },
            },
            select: { sdkName: true, sdkVersion: true },
            orderBy: { createdAt: 'desc' },
          },
          httpHosts: {
            where: {
              status: {
                in: ['ONLINE', 'UNREACHABLE'],
              },
            },
            select: { sdkName: true, sdkVersion: true },
            orderBy: { createdAt: 'desc' },
          },
          transactions: {
            where: {
              actionScheduleId: {
                not: null,
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          ...actionMetadataWithAccesses(user.id).include,
        },
      })

      if (
        !action ||
        (action.developerId && action.developerId !== user.id) ||
        !action.organization.userOrganizationAccess?.length
      ) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const requiredPermission = action.developerId
        ? 'READ_DEV_ACTIONS'
        : 'READ_PROD_ACTIONS'

      if (!hasPermission(userOrganizationAccess, requiredPermission)) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const groupsMap = await getAllActionGroups({
        organizationId,
        developerId: environment === 'DEVELOPMENT' ? user.id : null,
        organizationEnvironmentId,
      })

      const isUsingCodeBasedPermissions = [
        ...action.hostInstances,
        ...action.httpHosts,
      ].some(h => {
        return (
          h.sdkName === NODE_SDK_NAME &&
          h.sdkVersion &&
          h.sdkVersion >= SDK_PERMISSIONS_MIN_VERSION
        )
      })

      return {
        ...action,
        ...getActionAccessLevel({ action, groupsMap }),
        isUsingCodeBasedPermissions,
      }
    },
  })
  .mutation('general.update', {
    input: z.object({
      actionId: z.string(),
      data: z.object({
        name: z
          .string()
          .transform(s => s.trim())
          .nullish(),
        backgroundable: z.boolean().nullish(),
        description: z
          .string()
          .transform(s => s.trim())
          .nullable()
          .optional(),
      }),
    }),
    async resolve({
      ctx: { prisma, userOrganizationAccess, organizationId },
      input: { actionId, data },
    }) {
      if (!hasPermission(userOrganizationAccess, 'WRITE_PROD_ACTIONS')) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      if (!isFlagEnabled('ACTION_METADATA_GENERAL_CONFIG', organizationId)) {
        return
      }

      const metadata = await prisma.actionMetadata.upsert({
        where: { actionId },
        create: {
          actionId,
          ...data,
        },
        update: data,
        include: {
          action: {
            include: {
              schedules: {
                where: {
                  deletedAt: null,
                },
              },
            },
          },
        },
      })

      if (!isBackgroundable({ ...metadata.action, metadata })) {
        await syncActionSchedules(metadata.action, [])
      }

      return metadata
    },
  })
  .mutation('notifications.update', {
    input: z.object({
      actionId: z.string(),
      data: z.object({
        defaultNotificationDelivery: z
          .union([
            z.null(),
            z.array(
              z.object({
                method: z.nativeEnum(NotificationMethod),
                to: z.string(),
              })
            ),
          ])
          .nullable(),
      }),
    }),
    async resolve({
      ctx: { prisma, userOrganizationAccess },
      input: { actionId, data },
    }) {
      if (!hasPermission(userOrganizationAccess, 'WRITE_PROD_ACTIONS')) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const defaultNotificationDelivery =
        data.defaultNotificationDelivery === null
          ? Prisma.DbNull
          : JSON.stringify(data.defaultNotificationDelivery)

      const metadata = await prisma.actionMetadata.upsert({
        where: { actionId },
        create: {
          actionId,
          defaultNotificationDelivery,
        },
        update: {
          defaultNotificationDelivery,
        },
      })

      return metadata
    },
  })
  .mutation('permissions.update', {
    input: z.object({
      actionId: z.string(),
      data: z.object({
        availability: z.nativeEnum(ActionAvailability).nullable(),
        groupPermissions: z
          .array(
            z.object({
              groupId: z.string(),
              level: z.union([
                z.nativeEnum(ActionAccessLevel),
                z.literal('NONE'),
              ]),
            })
          )
          .optional(),
      }),
    }),
    async resolve({
      ctx: { prisma, userOrganizationAccess },
      input: { actionId, data },
    }) {
      if (!hasPermission(userOrganizationAccess, 'WRITE_PROD_ACTIONS')) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const { groupPermissions, availability } = data

      const actionMetadata = await prisma.actionMetadata.upsert({
        where: { actionId },
        create: {
          actionId,
          availability,
        },
        update: {
          availability,
        },
      })

      await setActionPermissions({
        actionMetadata,
        teamPermissions: groupPermissions,
      })

      return actionMetadata
    },
  })
  .mutation('schedule.update', {
    input: z.object({
      actionId: z.string(),
      data: z.object({
        actionScheduleInputs: z.array(
          z.object({
            id: z.string().optional(), // Used on frontend only, here for types
            schedulePeriod: z.enum(['now', 'once', 'hour', 'day', 'week', 'month']),
            timeZoneName: z.enum(ALL_TIMEZONES).optional(),
            hours: z.number().int().optional(),
            minutes: z.number().int().optional(),
            dayOfWeek: z.number().int().optional(),
            dayOfMonth: z.number().int().optional(),
            date: z.string().nullish(),
            notifyOnSuccess: z.boolean().optional(),
            runnerId: z.string().nullish(),
          })
        ),
      }),
    }),
    async resolve({
      ctx: { prisma, userOrganizationAccess },
      input: { actionId, data },
    }) {
      if (!hasPermission(userOrganizationAccess, 'WRITE_PROD_ACTIONS')) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const { actionScheduleInputs } = data

      const metadata = await prisma.actionMetadata.upsert({
        where: { actionId },
        create: {
          actionId,
        },
        update: {},
        include: {
          action: {
            include: {
              schedules: {
                where: {
                  deletedAt: null,
                },
              },
            },
          },
        },
      })

      const { action } = metadata

      if (
        actionScheduleInputs?.some(
          scheduleInput => !isInputValid(scheduleInput)
        )
      ) {
        logger.error('Failed syncing action schedules', {
          actionId,
          actionScheduleInputs,
        })

        throw new TRPCError({ code: 'BAD_REQUEST' })
      }

      try {
        await syncActionSchedules(
          { ...action, metadata },
          actionScheduleInputs ?? []
        )
      } catch (error) {
        logger.error(
          `Failed syncing action schedules for action ${action.slug}`,
          {
            actionId,
            actionScheduleInputs,
            error,
          }
        )

        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      }
    },
  })
  .mutation('archive', {
    input: z.object({
      actionId: z.string(),
    }),
    async resolve({
      ctx: { prisma, userOrganizationAccess },
      input: { actionId },
    }) {
      if (!hasPermission(userOrganizationAccess, 'WRITE_PROD_ACTIONS')) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const action = await prisma.action.findFirst({
        where: { id: actionId },
        include: {
          schedules: {
            where: {
              deletedAt: null,
            },
          },
          metadata: true,
        },
      })

      if (!action) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      // Remove all schedules
      try {
        await syncActionSchedules(action, [])
      } catch (err) {
        logger.error(
          `Failed remove action schedules for action ${action.slug}`,
          {
            actionId: action.id,
          }
        )
      }

      await prisma.actionMetadata.upsert({
        where: {
          actionId: action.id,
        },
        create: {
          actionId: action.id,
          archivedAt: new Date(),
        },
        update: {
          archivedAt: new Date(),
        },
      })
    },
  })
  .mutation('unarchive', {
    input: z.object({
      actionId: z.string(),
    }),
    async resolve({
      ctx: { prisma, userOrganizationAccess },
      input: { actionId },
    }) {
      if (!hasPermission(userOrganizationAccess, 'WRITE_PROD_ACTIONS')) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      return prisma.actionMetadata.update({
        where: { actionId },
        data: {
          archivedAt: null,
        },
      })
    },
  })
  .mutation('dequeue', {
    input: z.object({
      queuedActionId: z.string(),
    }),
    async resolve({
      ctx: { prisma, organizationId, user, userOrganizationAccess },
      input: { queuedActionId },
    }) {
      const queuedAction = await prisma.queuedAction.findUnique({
        where: {
          id: queuedActionId,
        },
        include: {
          action: true,
        },
      })

      if (
        !queuedAction ||
        queuedAction.action.organizationId !== organizationId
      ) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      if (
        queuedAction.action.developerId !== user.id &&
        !hasPermission(userOrganizationAccess, 'DEQUEUE_PROD_ACTIONS')
      ) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      return prisma.queuedAction.delete({
        where: { id: queuedActionId },
      })
    },
  })
