import { z } from 'zod'
import { Prisma, UserAccessPermission } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import {
  createRouter,
  authenticatedMiddleware,
  organizationMiddleware,
} from './util'
import { hasPermission } from '~/utils/permissions'
import { inviteNewUser } from '~/emails'
import { createOrganization, isSlugAvailable } from '../utils/organizations'
import env from '~/env'
import { nanoid } from 'nanoid'
import {
  getChannelsFromSlackIntegration,
  SlackChannel,
} from '~/server/utils/slack'
import { processInvitationGroupIds } from '../user'
import { logger } from '~/server/utils/logger'
import { SLACK_OAUTH_SCOPES } from '~/utils/isomorphicConsts'

export const organizationRouter = createRouter()
  .query('slug', {
    input: z.object({
      slug: z.string(),
    }),
    async resolve({ ctx: { prisma, user }, input }) {
      const org = await prisma.organization.findFirst({
        where: { slug: input.slug, deletedAt: null },
        include: {
          userOrganizationAccess: user
            ? {
                where: {
                  userId: user.id,
                },
              }
            : false,
          environments: {
            where: {
              deletedAt: null,
            },
            // TODO: Order nulls first after updating Prisma
            orderBy: {
              slug: 'asc',
            },
          },
          featureFlags: true,
          sso: true,
        },
      })

      if (!org) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      if (
        !org.isGhostMode &&
        (!org.userOrganizationAccess || org.userOrganizationAccess.length === 0)
      ) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const privateOrg = await prisma.organizationPrivate.findFirst({
        where: {
          organizationId: org.id,
        },
      })

      return {
        ...org,
        connectedToSlack: !!privateOrg?.slackAccessToken,
        promoCode: org.promoCode,
      }
    },
  })
  .middleware(authenticatedMiddleware)
  .query('is-slug-available', {
    input: z.object({
      slug: z.string(),
      id: z.string().optional(),
    }),
    async resolve({ input: { id, slug } }) {
      return isSlugAvailable(slug, id)
    },
  })
  .query('slack-channels', {
    async resolve({ ctx: { prisma, organizationId } }) {
      const privateOrg = await prisma.organizationPrivate.findFirst({
        where: {
          organizationId,
        },
      })

      let slackChannels: SlackChannel[] = []

      if (privateOrg?.slackAccessToken) {
        slackChannels = await getChannelsFromSlackIntegration(
          privateOrg.slackAccessToken,
          privateOrg.organizationId
        )
      }

      return slackChannels.map(c => c.name)
    },
  })
  .mutation('create', {
    input: z.object({
      slug: z.string(),
      name: z.string(),
    }),
    async resolve({ ctx: { user }, input: { slug, name } }) {
      if (!isSlugAvailable(slug)) {
        throw new TRPCError({ code: 'BAD_REQUEST' })
      }

      return await createOrganization({
        slug,
        name,
        ownerId: user.id,
      })
    },
  })
  .mutation('join', {
    input: z.object({
      invitationId: z.string(),
      accept: z.boolean(),
    }),
    async resolve({ ctx: { prisma, user }, input: { accept, invitationId } }) {
      const invitation = await prisma.userOrganizationInvitation.findUnique({
        where: { id: invitationId },
      })

      if (!invitation) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      if (invitation.email !== user.email) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Sorry, this invitation is for another email address. You are logged in as ${user.email}.`,
        })
      }

      const existing = await prisma.userOrganizationAccess.findFirst({
        where: {
          userId: user.id,
          organizationId: invitation.organizationId,
        },
      })

      if (existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You are already a member of this organization.',
        })
      }

      let access: Prisma.UserOrganizationAccessGetPayload<{
        select: {
          id: true
          userId: true
          organization: { select: { slug: true; name: true } }
        }
      }> | null = null

      if (accept) {
        access = await prisma.userOrganizationAccess.create({
          data: {
            permissions: invitation.permissions,
            organization: {
              connect: {
                id: invitation.organizationId,
              },
            },
            user: {
              connect: {
                id: user.id,
              },
            },
          },
          select: {
            id: true,
            userId: true,
            organization: { select: { slug: true, name: true } },
          },
        })

        await processInvitationGroupIds(invitation, access)
      }

      await prisma.userOrganizationInvitation.delete({
        where: { id: invitationId },
      })

      return access
    },
  })
  // ********** Endpoints below here require organization access **********
  .middleware(organizationMiddleware)
  .mutation('switch', {
    input: z.object({
      organizationId: z.string(),
    }),
    async resolve({ ctx: { prisma, user }, input: { organizationId } }) {
      try {
        return prisma.userOrganizationAccess.update({
          where: {
            userId_organizationId: {
              userId: user.id,
              organizationId,
            },
          },
          data: {
            lastSwitchedToAt: new Date(),
          },
        })
      } catch (err) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
    },
  })
  .query('users', {
    input: z
      .object({
        searchQuery: z.string().optional(),
        limit: z.number().optional(),
      })
      .default({}),
    async resolve({
      ctx: { prisma, userOrganizationAccess, organizationId },
      input: { searchQuery, limit },
    }) {
      if (!hasPermission(userOrganizationAccess, 'READ_USERS')) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      let userSearchFilter:
        | Prisma.UserOrganizationAccessWhereInput['user']
        | undefined
      searchQuery = searchQuery?.trim()
      // This is pretty naive and only find complete (non-fuzzy) matches
      //
      // Unfortunately, PostgreSQL full-text search isn't helpful here
      // because it requires full-token matches
      if (searchQuery) {
        const colsToSearch = ['firstName', 'lastName', 'email']
        userSearchFilter = {
          OR: colsToSearch.flatMap(colName => [
            {
              [colName]: {
                search: searchQuery,
              },
              [colName]: {
                contains: searchQuery,
              },
            },
          ]),
        }
      }

      return prisma.userOrganizationAccess.findMany({
        where: {
          organizationId,
          user: userSearchFilter,
        },
        select: {
          id: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: [
          // Order by first name first because that's how we display them
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
          {
            user: {
              email: 'asc',
            },
          },
        ],
        take: limit,
      })
    },
  })
  .mutation('edit', {
    input: z.object({
      id: z.string(),
      data: z.object({
        slug: z.string().optional(),
        name: z.string().optional(),
      }),
    }),
    async resolve({
      ctx: { prisma, userOrganizationAccess, organizationId },
      input: { id, data },
    }) {
      if (!hasPermission(userOrganizationAccess, 'WRITE_ORG_SETTINGS')) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      if (data.slug) {
        if (!isSlugAvailable(data.slug, organizationId)) {
          throw new TRPCError({ code: 'BAD_REQUEST' })
        }
      }

      const org = await prisma.organization.findFirst({
        where: {
          id,
        },
      })

      if (!org) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const organization = await prisma.organization.update({
        where: {
          id,
        },
        data,
      })

      return organization
    },
  })
  .mutation('edit.mfa', {
    input: z.object({
      requireMfa: z.boolean().optional(),
    }),
    async resolve({
      ctx: { prisma, userOrganizationAccess, organizationId },
      input: { requireMfa },
    }) {
      if (!hasPermission(userOrganizationAccess, 'WRITE_ORG_SETTINGS')) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const org = await prisma.organization.findFirst({
        where: {
          id: organizationId,
        },
      })

      if (!org) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const organization = await prisma.organization.update({
        where: {
          id: organizationId,
        },
        data: {
          requireMfa,
        },
      })

      return organization
    },
  })
  .mutation('delete', {
    async resolve({ ctx: { prisma, user, organizationId } }) {
      const org = await prisma.organization.findUnique({
        where: {
          id: organizationId,
        },
      })

      if (org?.ownerId !== user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const otherOrganizations = await prisma.organization.findMany({
        where: {
          id: {
            not: org.id,
          },
          ownerId: user.id,
        },
      })

      // Need at least one organization remaining
      if (otherOrganizations.length < 1) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      return await prisma.organization.update({
        where: {
          id: org.id,
        },
        data: {
          deletedAt: new Date(),
        },
      })
    },
  })
  .mutation('add-user', {
    input: z.object({
      email: z
        .string()
        .email()
        .transform(email => email.toLowerCase()),
      permissions: z.array(z.nativeEnum(UserAccessPermission)),
      groupIds: z.array(z.string()),
    }),
    async resolve({
      ctx: { prisma, userOrganizationAccess, organizationId },
      input: { email, permissions, groupIds },
    }) {
      if (!hasPermission(userOrganizationAccess, 'WRITE_USERS')) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const existingUser = await prisma.user.findFirst({
        where: { email },
      })

      if (existingUser) {
        const existingAccess = await prisma.userOrganizationAccess.findFirst({
          where: {
            userId: existingUser.id,
            organizationId,
          },
        })

        if (existingAccess) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'That user is already a member of this organization.',
          })
        }
      }

      const invitation = await prisma.userOrganizationInvitation.create({
        data: {
          email,
          organizationId,
          permissions,
          groupIds,
        },
        include: {
          organization: true,
        },
      })

      const didSend = await inviteNewUser(email, {
        organizationName: invitation.organization.name,
        signupUrl: `${env.APP_URL}/accept-invitation?token=${invitation.id}`,
        preheader: `You've been invited to join ${invitation.organization.name} on Interval.`,
      })

      return { didSendInvitation: didSend?.response?.Message === 'OK' ?? false }
    },
  })
  .mutation('revoke-invitation', {
    input: z.object({
      id: z.string(),
    }),
    async resolve({ ctx: { prisma, userOrganizationAccess }, input }) {
      if (!hasPermission(userOrganizationAccess, 'WRITE_USERS')) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      try {
        await prisma.userOrganizationInvitation.delete({
          where: { id: input.id },
        })
      } catch (error) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return true
    },
  })
  .mutation('edit-user-access', {
    input: z.object({
      id: z.string(),
      data: z.object({
        permissions: z.array(z.nativeEnum(UserAccessPermission)).optional(),
      }),
    }),
    async resolve({
      ctx: { prisma, userOrganizationAccess },
      input: { id, data },
    }) {
      if (
        !hasPermission(userOrganizationAccess, 'WRITE_USERS') ||
        // Cannot edit own access
        userOrganizationAccess.id === id
      ) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const access = await prisma.userOrganizationAccess.findUnique({
        where: {
          id,
        },
        include: {
          organization: true,
        },
      })

      if (!access) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      // Cannot edit access of owner
      if (access.userId === access.organization.ownerId) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      try {
        const access = await prisma.userOrganizationAccess.update({
          where: {
            id,
          },
          data: {
            ...data,
            updatedAt: new Date(),
          },
        })

        return access
      } catch (err) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
    },
  })
  .mutation('remove-user', {
    input: z.object({
      id: z.string(),
    }),
    async resolve({ ctx: { prisma, userOrganizationAccess }, input: { id } }) {
      if (
        !hasPermission(userOrganizationAccess, 'WRITE_USERS') ||
        // Cannot remove self
        userOrganizationAccess.id === id
      ) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const access = await prisma.userOrganizationAccess.findUnique({
        where: {
          id,
        },
        include: {
          organization: {
            include: {
              sso: true,
            },
          },
          user: true,
        },
      })

      if (!access) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      // Cannot remove owner
      if (access.userId === access.organization.ownerId) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      if (access.user.idpId && access.organization.sso?.workosOrganizationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `This user is managed by an external identity provider. Please remove them from your identity provider instead.`,
        })
      }

      try {
        // delete access group memberships
        await prisma.userAccessGroupMembership.deleteMany({
          where: { userOrganizationAccessId: access.id },
        })
        const deletedAccess = await prisma.userOrganizationAccess.delete({
          where: { id },
        })

        await prisma.apiKey.updateMany({
          where: {
            userId: deletedAccess.userId,
            organizationId: deletedAccess.organizationId,
            deletedAt: null,
          },
          data: {
            deletedAt: new Date(),
          },
        })

        return deletedAccess
      } catch (error) {
        logger.log('Error removing user from org', {
          userOrganizationAccessId: access.id,
          userId: userOrganizationAccess.userId,
          error,
        })
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
    },
  })
  .mutation('start-slack-oauth', {
    async resolve({ ctx: { prisma, userOrganizationAccess } }) {
      if (!hasPermission(userOrganizationAccess, 'WRITE_ORG_OAUTH')) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      if (!userOrganizationAccess) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      if (!process.env.SLACK_CLIENT_ID || !process.env.SLACK_CLIENT_SECRET) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Please add Slack OAuth keys to your Interval instance before enabling this integration.`,
        })
      }

      const slackOauthNonce = nanoid()

      await prisma.userOrganizationAccess.update({
        where: {
          id: userOrganizationAccess.id,
        },
        data: { slackOauthNonce },
      })

      const params = new URLSearchParams({
        scope: SLACK_OAUTH_SCOPES,
        client_id: process.env.SLACK_CLIENT_ID,
        state: slackOauthNonce,
        redirect_uri: `${env.APP_URL}/api/auth/oauth/slack`,
      })

      const oauthUrl = `https://slack.com/oauth/v2/authorize?${params.toString()}`

      return oauthUrl
    },
  })
