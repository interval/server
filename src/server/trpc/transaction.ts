import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import {
  Prisma,
  HostInstance,
  QueuedAction,
  UsageEnvironment,
  TransactionStatus,
  TransactionResultStatus,
} from '@prisma/client'
import {
  createRouter,
  authenticatedMiddleware,
  organizationMiddleware,
} from './util'
import { hasPermission } from '~/utils/permissions'
import { authorizePotentialGhostRequest } from '../utils/ghostMode'
import {
  cancelTransaction,
  getCurrentHostInstance,
} from '../utils/transactions'
import { getActionAccessLevel } from '~/utils/actions'
import {
  actionMetadataWithAccesses,
  addPermissionsToGroups,
  getAllActionGroups,
} from '../utils/actions'
import { PRODUCTION_ORG_ENV_SLUG } from '~/utils/environments'
import { logger } from '~/server/utils/logger'

export const transactionRouter = createRouter()
  // placed before middleware because this route is used in ghost mode
  .query('console.action.list', {
    input: z.object({ actionSlug: z.string() }),
    async resolve({ ctx, input: { actionSlug } }) {
      const { prisma } = ctx

      const { userId, organizationId, organizationEnvironmentId } =
        await authorizePotentialGhostRequest(ctx, 'READ_DEV_ACTIONS')

      const transactions = await prisma.transaction.findMany({
        where: {
          action: {
            organizationId,
            slug: actionSlug,
            developerId: userId,
            organizationEnvironmentId,
          },
          status: {
            in: ['PENDING', 'COMPLETED', 'RUNNING', 'AWAITING_INPUT'],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
      })

      // Only show the most recent alive transaction in the UI
      let firstFound = false
      return transactions.filter(transaction => {
        if (
          transaction.status === 'PENDING' ||
          transaction.status === 'RUNNING' ||
          transaction.status === 'AWAITING_INPUT'
        ) {
          if (!firstFound) {
            firstFound = true
            return true
          }
          return false
        }

        return true
      })
    },
  })
  .middleware(authenticatedMiddleware)
  .middleware(organizationMiddleware)
  .query('index', {
    input: z.object({
      skip: z.number().int().optional(),
      limit: z.number().int().default(50),
      environment: z.string().optional().default(PRODUCTION_ORG_ENV_SLUG),
      search: z.string().optional(),
      slugFilter: z.string().optional(),
    }),
    async resolve({
      input: { skip, limit, environment, slugFilter, search },
      ctx: { prisma, user, userOrganizationAccess, organizationId },
    }) {
      if (!hasPermission(userOrganizationAccess, 'READ_PROD_TRANSACTIONS')) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      let organizationEnvironmentId: string | null = null

      const organizationEnvironment =
        await prisma.organizationEnvironment.findFirst({
          where: {
            organizationId,
            slug: environment,
          },
        })

      if (!organizationEnvironment) {
        throw new Error('Environment not found')
      }

      organizationEnvironmentId = organizationEnvironment.id

      let searchStatus: TransactionStatus | undefined
      let searchResultStatus: TransactionResultStatus | undefined

      if (search) {
        const words = search.split(' ')
        for (let i = 0; i < words.length; i++) {
          const word = words[i]
          let upper = word.toUpperCase()
          // Text aliases for statuses
          switch (upper) {
            case 'ERROR':
              upper = 'FAILURE'
              break
            case 'COMPLETED':
              upper = 'SUCCESS'
              break
            case 'CLOSED':
              upper = 'CLIENT_CONNECTION_DROPPED'
              break
            case 'CONNECTION':
              if (
                i < words.length - 1 &&
                words[i + 1]?.toUpperCase() === 'LOST'
              ) {
                upper = 'HOST_CONNECTION_DROPPED'
              }
              break
          }

          if (!searchStatus && upper in TransactionStatus) {
            searchStatus = upper as TransactionStatus
          }

          if (!searchResultStatus && upper in TransactionResultStatus) {
            searchResultStatus = upper as TransactionResultStatus
          }
        }
      }

      const transactionWhere: Prisma.TransactionWhereInput = {
        action: {
          organizationId,
          developerId: null,
          organizationEnvironmentId,
          slug: slugFilter,
        },
        OR: search
          ? [
              {
                status: searchStatus,
              },
              {
                resultStatus: searchResultStatus,
              },
              {
                action: {
                  OR: [
                    { name: { search } },
                    { name: { contains: search, mode: 'insensitive' } },
                    { slug: { contains: search, mode: 'insensitive' } },
                  ],
                },
              },
              {
                owner: {
                  OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                  ],
                },
              },
            ]
          : undefined,
      }

      const [transactions, totalTransactions] = await Promise.all([
        prisma.transaction.findMany({
          where: transactionWhere,
          include: {
            actionSchedule: true,
            actionScheduleRun: true,
            action: {
              include: {
                metadata: {
                  include: {
                    accesses: {
                      where: {
                        level: 'ADMINISTRATOR',
                        userAccessGroup: {
                          memberships: {
                            some: {
                              userOrganizationAccessId:
                                userOrganizationAccess.id,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            owner: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
        }),
        prisma.transaction.count({
          where: transactionWhere,
        }),
      ])

      const canViewOrgTransactions = hasPermission(
        userOrganizationAccess,
        'READ_ORG_PROD_TRANSACTIONS'
      )

      const filteredTransactions = transactions.filter(tx => {
        return (
          canViewOrgTransactions ||
          tx.action.metadata?.accesses.length ||
          tx.ownerId === user.id
        )
      })

      return {
        transactions: filteredTransactions,
        totalTransactions,
      }
    },
  })
  .mutation('add', {
    input: z.object({
      environment: z.nativeEnum(UsageEnvironment).default('PRODUCTION'),
      actionSlug: z.string(),
      queuedActionId: z.string().optional(),
      id: z.string().nullable().optional(),
      parent: z
        .object({
          type: z.enum(['Action', 'ActionGroup']),
          id: z.string(),
          hostInstanceId: z.string(),
        })
        .optional(),
    }),
    async resolve({
      ctx: {
        prisma,
        user,
        organizationId,
        userOrganizationAccess,
        organizationEnvironmentId,
      },
      input: { environment, actionSlug, queuedActionId, id, parent },
    }) {
      const requiredPermission =
        environment === 'DEVELOPMENT' ? 'RUN_DEV_ACTIONS' : 'RUN_PROD_ACTIONS'

      if (!hasPermission(userOrganizationAccess, requiredPermission)) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      let action: Prisma.ActionGetPayload<{
        include: {
          hostInstances: {
            where: {
              status: 'ONLINE'
            }
            orderBy: {
              createdAt: 'desc'
            }
          }
          httpHosts: {
            where: {
              status: 'ONLINE'
            }
            orderBy: {
              createdAt: 'desc'
            }
          }
          metadata: {
            include: {
              accesses: true
            }
          }
        }
      }> | null = null

      if (parent) {
        // inline action
        if (process.env.NODE_ENV === 'production') {
          throw new TRPCError({ code: 'NOT_FOUND' })
        }

        const actionParent =
          parent.type === 'Action'
            ? await prisma.action.findUnique({
                where: {
                  id: parent.id,
                },
              })
            : await prisma.actionGroup.findUnique({
                where: {
                  id: parent.id,
                },
              })

        if (!actionParent) {
          throw new TRPCError({ code: 'NOT_FOUND' })
        }

        try {
          action = await prisma.action.findFirst({
            where: {
              isInline: true,
              slug: actionSlug,
              organizationId: actionParent.organizationId,
              developerId: actionParent.developerId,
              organizationEnvironmentId: actionParent.organizationEnvironmentId,
            },
            include: {
              hostInstances: {
                where: {
                  status: 'ONLINE',
                },
                orderBy: {
                  createdAt: 'desc',
                },
              },
              httpHosts: {
                where: {
                  status: 'ONLINE',
                },
                orderBy: {
                  createdAt: 'desc',
                },
              },
              metadata: {
                include: {
                  accesses: true,
                },
              },
            },
          })

          if (!action) {
            action = await prisma.action.create({
              data: {
                isInline: true,
                slug: actionSlug,
                organizationId: actionParent.organizationId,
                developerId: actionParent.developerId,
                organizationEnvironmentId:
                  actionParent.organizationEnvironmentId,
                hostInstances: {
                  connect: {
                    id: parent.hostInstanceId,
                  },
                },
              },
              include: {
                hostInstances: {
                  where: {
                    status: 'ONLINE',
                  },
                  orderBy: {
                    createdAt: 'desc',
                  },
                },
                httpHosts: {
                  where: {
                    status: 'ONLINE',
                  },
                  orderBy: {
                    createdAt: 'desc',
                  },
                },
                metadata: {
                  include: {
                    accesses: true,
                  },
                },
              },
            })
          }
        } catch (err) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            cause: err,
          })
        }
      } else {
        action = await prisma.action.findFirst({
          where: {
            slug: actionSlug,
            organizationId,
            developerId: environment === 'DEVELOPMENT' ? user.id : null,
            organizationEnvironmentId,
          },
          include: {
            hostInstances: {
              where: {
                status: 'ONLINE',
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
            httpHosts: {
              where: {
                status: 'ONLINE',
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
            ...actionMetadataWithAccesses(user.id).include,
          },
        })
      }

      if (!action) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Action lookup failed',
        })
      }

      const groups = await getAllActionGroups({
        organizationId,
        developerId: environment === 'DEVELOPMENT' ? user.id : null,
        organizationEnvironmentId,
        userId: user.id,
      })

      const groupsMap = addPermissionsToGroups({
        groups: Array.from(groups.values()),
      })

      const { canRun } = getActionAccessLevel({
        action,
        groupsMap,
      })

      if (!canRun) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User cannot access action',
        })
      }
      if (action.developerId && action.developerId !== user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'developerId does not match userId',
        })
      }

      let hostInstance: HostInstance
      try {
        hostInstance = await getCurrentHostInstance(action)
      } catch (err) {
        logger.error('Failed to obtain hostInstanceId for new transaction', {
          error: err,
        })
        throw new TRPCError({
          code: 'TIMEOUT',
          message: 'Could not get an online host instance for this transaction',
        })
      }

      type TransactionType = Prisma.TransactionGetPayload<{
        include: {
          action: {
            include: {
              metadata: true
            }
          }
          logs: {
            select: { data: true; index: true; createdAt: true }
            orderBy: [{ index: 'asc' }, { createdAt: 'asc' }]
          }
          owner: {
            select: { email: true }
          }
          hostInstance: {
            select: {
              sdkName: true
              sdkVersion: true
            }
          }
        }
      }>

      let transaction: TransactionType

      if (environment === 'PRODUCTION') {
        transaction = await prisma.transaction.create({
          data: {
            status: 'PENDING',
            action: { connect: { id: action.id } },
            hostInstance: { connect: { id: hostInstance.id } },
            owner: { connect: { id: user.id } },
          },
          include: {
            action: {
              include: {
                metadata: true,
              },
            },
            logs: {
              select: { data: true, index: true, createdAt: true },
              orderBy: [{ index: 'asc' }, { createdAt: 'asc' }],
            },
            owner: {
              select: { email: true },
            },
            hostInstance: {
              select: {
                sdkName: true,
                sdkVersion: true,
              },
            },
          },
        })
      } else {
        const userId = user.id

        const t = await (id
          ? prisma.transaction.findFirst({
              where: {
                id,
                actionId: action.id,
              },
              include: {
                action: {
                  include: {
                    metadata: true,
                  },
                },
                logs: {
                  select: { data: true, index: true, createdAt: true },
                  orderBy: [{ index: 'asc' }, { createdAt: 'asc' }],
                },
                owner: {
                  select: { email: true },
                },
                hostInstance: {
                  select: {
                    sdkName: true,
                    sdkVersion: true,
                  },
                },
              },
            })
          : id === undefined
          ? prisma.transaction
              .findFirst({
                where: {
                  hostInstanceId: hostInstance.id,
                  actionId: action.id,
                  ownerId: userId,

                  status: {
                    in: ['PENDING', 'RUNNING', 'AWAITING_INPUT'],
                  },
                },
                include: {
                  action: {
                    include: {
                      metadata: true,
                    },
                  },
                  logs: {
                    select: { data: true, index: true, createdAt: true },
                    orderBy: [{ index: 'asc' }, { createdAt: 'asc' }],
                  },
                  owner: {
                    select: { email: true },
                  },
                  hostInstance: {
                    select: {
                      sdkName: true,
                      sdkVersion: true,
                    },
                  },
                },
                orderBy: {
                  createdAt: 'desc',
                },
              })
              .then(async transaction => {
                if (!transaction) {
                  transaction = await prisma.transaction.create({
                    data: {
                      hostInstance: { connect: { id: hostInstance.id } },
                      // Action can't be null here because of check above
                      // This can't be statically proven easily because this is a callback, but is still true
                      action: {
                        connect: {
                          id: (action as NonNullable<typeof action>).id,
                        },
                      },
                      owner: { connect: { id: userId } },
                      status: 'PENDING',
                    },
                    include: {
                      action: {
                        include: {
                          metadata: true,
                        },
                      },
                      logs: {
                        select: { data: true, index: true, createdAt: true },
                        orderBy: [{ index: 'asc' }, { createdAt: 'asc' }],
                      },
                      owner: {
                        select: { email: true },
                      },
                      hostInstance: {
                        select: {
                          sdkName: true,
                          sdkVersion: true,
                        },
                      },
                    },
                  })
                }

                return transaction
              })
          : prisma.transaction.create({
              data: {
                hostInstance: { connect: { id: hostInstance.id } },
                action: { connect: { id: action.id } },
                owner: { connect: { id: userId } },
                status: 'PENDING',
              },
              include: {
                action: {
                  include: {
                    metadata: true,
                  },
                },
                logs: {
                  select: { data: true, index: true, createdAt: true },
                  orderBy: [{ index: 'asc' }, { createdAt: 'asc' }],
                },
                owner: {
                  select: { email: true },
                },
                hostInstance: {
                  select: {
                    sdkName: true,
                    sdkVersion: true,
                  },
                },
              },
            }))

        if (!t) {
          throw new TRPCError({ code: 'NOT_FOUND' })
        }

        transaction = t
      }

      if (hostInstance.requestId) {
        await prisma.httpHostRequest.update({
          where: {
            id: hostInstance.requestId,
          },
          data: {
            invalidAt: new Date(),
          },
        })
      }

      let queuedAction: QueuedAction | null = null
      if (queuedActionId) {
        try {
          queuedAction = await prisma.queuedAction.findUnique({
            where: {
              id: queuedActionId,
            },
          })

          if (!queuedAction || queuedAction.actionId !== transaction.actionId) {
            throw new Error('Queued action not found')
          }

          if (queuedAction.assigneeId && queuedAction.assigneeId !== user.id) {
            throw new Error('Queued action assigned to someone other than user')
          }

          queuedAction = await prisma.queuedAction.update({
            where: {
              id: queuedActionId,
            },
            data: {
              transactionId: transaction.id,
            },
          })
        } catch (err) {
          logger.error('Failed starting queued action', { error: err })
        }
      }

      return {
        ...transaction,
        queuedAction,
      }
    },
  })
  .mutation('cancel', {
    input: z.object({
      transactionId: z.string(),
    }),
    async resolve({ ctx: { prisma, user }, input }) {
      const t = await prisma.transaction.findUnique({
        where: { id: input.transactionId },
        include: {
          queuedAction: true,
        },
      })

      if (!t) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      if (user.id !== t.ownerId) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      if (t.queuedAction) {
        await prisma.queuedAction.update({
          where: {
            id: t.queuedAction.id,
          },
          data: {
            transactionId: null,
          },
        })
      }

      cancelTransaction(t)

      return await prisma.transaction.update({
        where: { id: t.id },
        data: {
          status: 'COMPLETED',
          resultStatus: 'CANCELED',
          completedAt: new Date(),
        },
      })
    },
  })
  .query('dashboard.show', {
    input: z.object({ transactionId: z.string() }),
    async resolve({ ctx: { prisma, user, userOrganizationAccess }, input }) {
      const transaction = await prisma.transaction.findUnique({
        where: { id: input.transactionId },
        include: {
          action: {
            include: {
              metadata: true,
            },
          },
          queuedAction: true,
          owner: {
            select: { email: true },
          },
          logs: {
            select: { data: true, index: true, createdAt: true },
            orderBy: [{ index: 'asc' }, { createdAt: 'asc' }],
          },
          hostInstance: {
            select: {
              sdkName: true,
              sdkVersion: true,
            },
          },
        },
      })

      if (
        !transaction ||
        (transaction.action.developerId &&
          transaction.action.developerId !== user.id)
      ) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const requiredPermission = transaction.action.developerId
        ? 'READ_DEV_TRANSACTIONS'
        : 'READ_PROD_TRANSACTIONS'

      if (!hasPermission(userOrganizationAccess, requiredPermission)) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      return transaction
    },
  })
