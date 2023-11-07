import * as trpc from '@trpc/server'
import * as trpcExpress from '@trpc/server/adapters/express'
import prisma from '~/server/prisma'
import { MiddlewareFunction } from '@trpc/server/dist/declarations/src/internals/middlewares'
import {
  OrganizationEnvironment,
  UserOrganizationAccess,
  UserSession,
  Organization,
} from '@prisma/client'
import {
  validateSession,
  AuthenticationError,
  SessionUserData,
} from '~/server/auth'
import { sessionHasMfa } from '~/utils/auth'
import { isWorkOSEnabled } from '~/server/auth'
import { PRODUCTION_ORG_ENV_SLUG } from '~/utils/environments'
import { logger } from '~/server/utils/logger'

// create context based of incoming request
// set as optional here so it can also be re-used for `getStaticProps()`
export async function createContext(
  opts?: trpcExpress.CreateExpressContextOptions
) {
  const req = opts?.req

  let user: SessionUserData | undefined
  let session: UserSession | undefined
  let organizationId: string | undefined
  let organization:
    | (Organization & { environments: OrganizationEnvironment[] })
    | null
    | undefined
  let userOrganizationAccess: UserOrganizationAccess | null | undefined
  let organizationEnvironmentId: string | null = null
  let organizationEnvironment: OrganizationEnvironment | null | undefined

  if (req) {
    let sessionUpdated = false
    let sessionDestroyed = false

    if (req.session?.user && req.session?.session) {
      try {
        const validatedUserSession = await validateSession(
          req.session.session.id
        )
        if (validatedUserSession) {
          user = validatedUserSession.user
          session = validatedUserSession.session
          req.session.user = user
          req.session.session = session
          sessionUpdated = true
        }
      } catch (err) {
        if (err instanceof AuthenticationError) {
          switch (err.code) {
            case 'NEEDS_MFA':
              logger.error('Session needs MFA', {
                sessionId: req.session.session.id,
              })
              break
            case 'INVALID':
            case 'EXPIRED':
            case 'NOT_FOUND':
              logger.error('Invalid or expired session, clearing', {
                sessionId: req.session.session?.id,
                error: err,
              })
              req.session.destroy()
              sessionDestroyed = true
          }
        } else {
          logger.error('Error validating session', { error: err })
          // Errors will be thrown/logged in middleware or auth checks
        }
      }
    }

    if (
      req.headers.__interval_organization_id &&
      // For some reason undefined headers are being stringified instead of discarded during serialization
      req.headers.__interval_organization_id !== 'undefined'
    ) {
      organizationId = String(req.headers.__interval_organization_id)

      req.session.currentOrganizationId = organizationId
      sessionUpdated = true
    } else {
      req.session.currentOrganizationId = undefined
      sessionUpdated = true
    }

    if (user && organizationId) {
      const access = await prisma.userOrganizationAccess.findUnique({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId,
          },
        },
        include: {
          organization: {
            include: {
              environments: {
                where: {
                  deletedAt: null,
                },
              },
            },
          },
        },
      })
      userOrganizationAccess = access
      organization = access?.organization
    }

    if (
      req.headers.__interval_organization_environment_id &&
      req.headers.__interval_organization_environment_id !== 'undefined'
    ) {
      organizationEnvironmentId =
        req.headers.__interval_organization_environment_id?.toString()
      req.session.currentOrganizaitonEnvironmentId = organizationEnvironmentId
      sessionUpdated = true
    } else {
      req.session.currentOrganizaitonEnvironmentId = undefined
      sessionUpdated = true
    }

    if (user && organization) {
      if (organizationEnvironmentId) {
        organizationEnvironment =
          organization.environments.find(
            env => env.id === organizationEnvironmentId
          ) ?? null
      } else {
        organizationEnvironment =
          organization.environments.find(
            env => env.slug === PRODUCTION_ORG_ENV_SLUG
          ) ?? null

        if (organizationEnvironment) {
          organizationEnvironmentId = organizationEnvironment.id
        }
      }
    }

    if (!sessionDestroyed && sessionUpdated) {
      await req.session.save()
    }
  }

  return {
    req,

    // make prisma available in router handlers
    prisma,

    // user session if authenticated
    session,

    // user information
    user,

    // current organization ID
    organizationId,

    // current organization
    organization,

    // UserOrganizationAccess for current organization
    userOrganizationAccess,

    // current organization environment ID
    organizationEnvironmentId,

    // current organization environment
    organizationEnvironment,
  }
}

export type Context = trpc.inferAsyncReturnType<typeof createContext>

export function createRouter() {
  return trpc.router<Context>()
}

export interface AuthenticatedContext extends Context {
  user: SessionUserData
  session: UserSession
}

export const authenticatedMiddleware: MiddlewareFunction<
  Context,
  AuthenticatedContext,
  unknown
> = ({ ctx, next }) => {
  if (!ctx?.user?.id || !ctx?.session) {
    throw new trpc.TRPCError({ code: 'UNAUTHORIZED' })
  }

  return next({
    ctx: {
      ...ctx,
      user: {
        ...ctx.user,
      },
      session: {
        ...ctx.session,
      },
    },
  })
}

export interface OrganizationContext extends AuthenticatedContext {
  organizationId: string
  organization: Organization & { environments: OrganizationEnvironment[] }
  userOrganizationAccess: UserOrganizationAccess
  organizationEnvironmentId: string
  organizationEnvironment: OrganizationEnvironment
}

// This relies on a header set by the client config if
// used within DashboardContext. Will not work elsewhere.
export const organizationMiddleware: MiddlewareFunction<
  AuthenticatedContext,
  OrganizationContext,
  unknown
> = ({ ctx, next }) => {
  if (!ctx.organizationId) {
    throw new trpc.TRPCError({ code: 'BAD_REQUEST' })
  }

  if (!ctx.userOrganizationAccess || !ctx.organization) {
    throw new trpc.TRPCError({ code: 'NOT_FOUND' })
  }

  if (!ctx.organizationEnvironmentId || !ctx.organizationEnvironment) {
    throw new trpc.TRPCError({ code: 'NOT_FOUND' })
  }

  if (
    isWorkOSEnabled &&
    ctx.organization.requireMfa &&
    !sessionHasMfa(ctx.session)
  ) {
    throw new trpc.TRPCError({
      code: 'UNAUTHORIZED',
      cause: new AuthenticationError('MFA_REQUIRED'),
    })
  }

  return next({
    ctx: {
      ...ctx,
      organizationId: ctx.organizationId,
      organization: ctx.organization,
      organizationEnvironmentId: ctx.organizationEnvironmentId,
      organizationEnvironment: ctx.organizationEnvironment,
      userOrganizationAccess: ctx.userOrganizationAccess,
    },
  })
}
