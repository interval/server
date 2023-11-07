import { z } from 'zod'
import { Prisma } from '@prisma/client'
import {
  createRouter,
  authenticatedMiddleware,
  organizationMiddleware,
} from './util'
import { hasPermission } from '~/utils/permissions'
import { isBackgroundable } from '~/utils/actions'
import {
  getAllActions,
  getAllActionGroups,
  reconstructActionGroups,
  actionMetadataWithAccesses,
} from '../utils/actions'
import { getDevKey } from '~/server/utils/apiKey'
import env from 'env'
import { isWorkOSEnabled } from '~/server/auth'

export const dashboardRouter = createRouter()
  .middleware(authenticatedMiddleware)
  .query('global-feature-flags', {
    async resolve({ ctx }) {
      return await ctx.prisma.globalFeatureFlag.findMany({
        where: {
          enabled: true,
        },
      })
    },
  })
  .query('integrations', {
    async resolve() {
      // TODO: postmark, etc
      return {
        slack: !!env.SLACK_CLIENT_ID && !!env.SLACK_CLIENT_SECRET,
        workos: isWorkOSEnabled,
      }
    },
  })
  .middleware(organizationMiddleware)
  .query('structure', {
    input: z
      .object({
        mode: z.enum(['live', 'console']).default('live'),
        // key is only used on the client for query key busting; has no effect
        key: z.string().optional(),
      })
      .default({}),
    async resolve({
      ctx: {
        user,
        organizationId,
        userOrganizationAccess,
        organizationEnvironmentId,
        prisma,
      },
      input: { mode },
    }) {
      if (
        !hasPermission(
          userOrganizationAccess,
          mode === 'live' ? 'READ_PROD_ACTIONS' : 'READ_DEV_ACTIONS'
        )
      ) {
        return {
          actions: [],
          groups: [],
          mostUsedActions: [],
        }
      }

      const canConfigureActions = hasPermission(
        userOrganizationAccess,
        'WRITE_PROD_ACTIONS'
      )
      const canRunActions = hasPermission(
        userOrganizationAccess,
        'RUN_PROD_ACTIONS'
      )

      const [actions, actionGroups, mostUsedActions] = await Promise.all([
        getAllActions({
          organizationId,
          developerId: mode === 'console' ? user.id : null,
          organizationEnvironmentId,
          userId: mode === 'live' ? user.id : undefined,
        }),
        getAllActionGroups({
          organizationId,
          developerId: mode === 'console' ? user.id : null,
          organizationEnvironmentId,
          userId: mode === 'live' ? user.id : undefined,
        }),
        canRunActions
          ? prisma.transaction.groupBy({
              by: ['actionId'],
              _count: {
                actionId: true,
              },
              where: {
                createdAt: {
                  gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
                },
              },
              orderBy: {
                _count: {
                  actionId: 'desc',
                },
              },
              take: 3,
            })
          : ([] as Prisma.TransactionGetPayload<{
              include: {
                action: true
                queuedAction: true
              }
            }>[]),
      ])

      const router = reconstructActionGroups({
        actionGroups: Array.from(actionGroups.values()),
        actions,
        canConfigureActions,
        mode,
      })

      return {
        actions: router.allActions,
        groups: router.allGroups,
        mostUsedActions,
      }
    },
  })
  .query('dev-host-status', {
    async resolve({
      ctx: { prisma, organizationId, userOrganizationAccess, user },
    }) {
      const devApiKey = await getDevKey({
        user,
        organizationId,
        userOrganizationAccess,
      })

      const devHosts = await prisma.hostInstance.findMany({
        where: {
          status: 'ONLINE',
          apiKeyId: devApiKey.id,
        },
      })

      return {
        hasOnlineDevHost: devHosts.length > 0,
        devApiKey: devApiKey.key,
      }
    },
  })
  .query('home.index', {
    input: z
      .object({
        slugPrefix: z.string().optional(),
      })
      .default({}),
    async resolve({
      ctx: {
        prisma,
        user,
        organizationId,
        userOrganizationAccess,
        organizationEnvironmentId,
      },
      input: { slugPrefix },
    }) {
      // Only need to show in-progress transactions if they can be acted on
      const canRunActions = hasPermission(
        userOrganizationAccess,
        'RUN_PROD_ACTIONS'
      )

      const [transactions, queuedActions, actions, actionGroups] =
        await Promise.all([
          canRunActions
            ? prisma.transaction.findMany({
                where: {
                  owner: {
                    id: user.id,
                  },
                  status: {
                    in: ['PENDING', 'RUNNING', 'AWAITING_INPUT'],
                  },
                  action: {
                    developerId: null,
                    organizationEnvironmentId,
                    slug: slugPrefix
                      ? {
                          startsWith: `${slugPrefix}/`,
                        }
                      : undefined,
                  },
                },
                include: {
                  action: actionMetadataWithAccesses(user.id),
                  queuedAction: true,
                },
                orderBy: {
                  createdAt: 'desc',
                },
              })
            : ([] as Prisma.TransactionGetPayload<{
                include: {
                  action: ReturnType<typeof actionMetadataWithAccesses>
                  queuedAction: true
                }
              }>[]),

          canRunActions
            ? prisma.queuedAction.findMany({
                where: {
                  action: {
                    organizationId,
                    developerId: null,
                    organizationEnvironmentId,
                    slug: slugPrefix
                      ? {
                          startsWith: `${slugPrefix}/`,
                        }
                      : undefined,
                  },
                  OR: [
                    {
                      action: {
                        metadata: null,
                      },
                    },
                    {
                      action: {
                        metadata: {
                          archivedAt: null,
                        },
                      },
                    },
                  ],
                  AND: [
                    {
                      OR: [
                        {
                          assigneeId: null,
                        },
                        {
                          assigneeId: user.id,
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
                            ownerId: user.id,
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
                  action: actionMetadataWithAccesses(user.id),
                  transaction: true,
                },
                orderBy: {
                  createdAt: 'desc',
                },
              })
            : ([] as Prisma.QueuedActionGetPayload<{
                include: {
                  action: ReturnType<typeof actionMetadataWithAccesses>
                  transaction: true
                }
              }>[]),

          hasPermission(userOrganizationAccess, 'READ_PROD_ACTIONS')
            ? prisma.action.findMany({
                where: {
                  isInline: false,
                  organizationId,
                  developerId: null,
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
                include: {
                  hostInstances: {
                    where: {
                      status: {
                        in: ['ONLINE', 'UNREACHABLE'],
                      },
                    },
                    orderBy: {
                      createdAt: 'desc',
                    },
                  },
                  httpHosts: {
                    where: {
                      status: {
                        in: ['ONLINE', 'UNREACHABLE'],
                      },
                    },
                    orderBy: {
                      createdAt: 'desc',
                    },
                  },
                  schedules: {
                    where: { deletedAt: null },
                  },
                  ...actionMetadataWithAccesses(user.id).include,
                },
                orderBy: {
                  slug: 'asc',
                },
              })
            : ([] as Prisma.ActionGetPayload<{
                include: {
                  hostInstances: true
                  httpHosts: true
                  metadata: ReturnType<
                    typeof actionMetadataWithAccesses
                  >['include']['metadata']
                  schedules: {
                    where: { deletedAt: null }
                  }
                }
              }>[]),

          hasPermission(userOrganizationAccess, 'READ_PROD_ACTIONS')
            ? prisma.actionGroup.findMany({
                where: {
                  organizationId,
                  organizationEnvironmentId,
                  developerId: null,
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
                  ...actionMetadataWithAccesses(user.id).include,
                },
                orderBy: {
                  slug: 'asc',
                },
              })
            : ([] as Prisma.ActionGroupGetPayload<{
                include: {
                  hostInstances: {
                    where: {
                      status: {
                        in: ['ONLINE', 'UNREACHABLE']
                      }
                    }
                    select: { status: true; isInitializing: true }
                    orderBy: { createdAt: 'desc' }
                  }
                  httpHosts: {
                    where: { status: { not: 'OFFLINE' } }
                    select: { status: true }
                    orderBy: { createdAt: 'desc' }
                  }
                  metadata: ReturnType<
                    typeof actionMetadataWithAccesses
                  >['include']['metadata']
                }
              }>[]),
        ])

      const canConfigureActions = hasPermission(
        userOrganizationAccess,
        'WRITE_PROD_ACTIONS'
      )

      const filteredActions = actions.filter(a => {
        if (a.metadata?.archivedAt) return false
        return true
      })

      const filteredTransactions = transactions.filter(tx => {
        return !tx.action.metadata?.archivedAt && isBackgroundable(tx.action)
      })

      const structure = reconstructActionGroups({
        slugPrefix,
        actionGroups,
        actions: filteredActions,
        canConfigureActions,
        mode: 'live',
      })

      return {
        ...structure,
        transactions: filteredTransactions,
        queuedActions,
        currentPage: slugPrefix
          ? structure.allGroups.find(g => g.slug === slugPrefix)
          : null,
      }
    },
  })
  .query('users.index', {
    input: z
      .object({
        groupId: z.string().optional(),
      })
      .default({}),
    async resolve({
      ctx: { prisma, userOrganizationAccess, organizationId },
      input: { groupId },
    }) {
      const [users, keys, pendingInvitations] = await Promise.all([
        hasPermission(userOrganizationAccess, 'READ_USERS')
          ? prisma.userOrganizationAccess.findMany({
              where: {
                organization: { id: organizationId },
                groupMemberships: groupId
                  ? {
                      some: {
                        groupId,
                      },
                    }
                  : undefined,
              },
              select: {
                id: true,
                permissions: true,
                createdAt: true,
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    idpId: true,
                    emailConfirmToken: {
                      select: {
                        email: true,
                      },
                    },
                  },
                },
                groupMemberships: {
                  select: {
                    group: {
                      select: {
                        id: true,
                        scimGroupId: true,
                      },
                    },
                  },
                },
              },
              orderBy: [
                {
                  user: {
                    firstName: 'asc',
                  },
                },
                {
                  user: {
                    lastName: 'asc',
                  },
                },
              ],
            })
          : ([] as Prisma.UserOrganizationAccessGetPayload<{
              select: {
                id: true
                permissions: true
                createdAt: true
                user: {
                  select: {
                    id: true
                    email: true
                    firstName: true
                    lastName: true
                    idpId: true
                    emailConfirmToken: {
                      select: {
                        email: true
                      }
                    }
                  }
                }
                groupMemberships: {
                  select: {
                    group: {
                      select: {
                        id: true
                        scimGroupId: true
                      }
                    }
                  }
                }
              }
            }>[]),

        hasPermission(userOrganizationAccess, 'READ_ORG_USER_API_KEY_EXISTENCE')
          ? prisma.apiKey.findMany({
              where: { organization: { id: organizationId } },
              select: {
                id: true,
                userId: true,
                label: true,
                createdAt: true,
                deletedAt: true,
                usageEnvironment: true,
                organizationEnvironment: true,
                hostInstances: {
                  select: {
                    createdAt: true,
                  },
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
          : ([] as Prisma.ApiKeyGetPayload<{
              select: {
                id: true
                userId: true
                label: true
                createdAt: true
                deletedAt: true
                usageEnvironment: true
                organizationEnvironment: true
                hostInstances: {
                  select: {
                    createdAt: true
                  }
                  orderBy: {
                    createdAt: 'desc'
                  }
                  take: 1
                }
              }
            }>[]),

        hasPermission(userOrganizationAccess, 'READ_USERS')
          ? prisma.userOrganizationInvitation.findMany({
              where: { organization: { id: organizationId } },
              select: {
                id: true,
                permissions: true,
                createdAt: true,
                email: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
            })
          : ([] as Prisma.UserOrganizationInvitationGetPayload<{
              select: {
                id: true
                permissions: true
                createdAt: true
                email: true
              }
            }>[]),
      ])

      return { users, keys, pendingInvitations }
    },
  })
