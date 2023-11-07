import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import {
  createRouter,
  authenticatedMiddleware,
  organizationMiddleware,
} from './util'
import { hasPermission } from '~/utils/permissions'
import { generateSlug, getCollisionSafeSlug } from '~/server/utils/slugs'
import {
  DEVELOPMENT_ORG_DEFAULT_COLOR,
  DEVELOPMENT_ORG_ENV_NAME,
  DEVELOPMENT_ORG_ENV_SLUG,
  PRODUCTION_ORG_ENV_NAME,
  PRODUCTION_ORG_ENV_SLUG,
} from '~/utils/environments'
import { isFlagEnabled } from '../utils/featureFlags'

async function validateEnvironment({
  id,
  prisma,
  organizationId,
  name,
}: {
  id?: string | undefined
  prisma: PrismaClient
  organizationId: string
  name: string
}) {
  const desiredSlug = generateSlug(name)

  const [existingName, existingSlug] = await Promise.all([
    prisma.organizationEnvironment.findFirst({
      where: {
        id: id ? { not: id } : undefined,
        organizationId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
        deletedAt: null,
      },
    }),
    prisma.organizationEnvironment.findMany({
      where: {
        id: id ? { not: id } : undefined,
        slug: {
          startsWith: desiredSlug,
        },
        organizationId,
        deletedAt: null,
      },
      select: {
        slug: true,
      },
    }),
  ])

  if (
    existingName ||
    name.toLowerCase() === PRODUCTION_ORG_ENV_NAME.toLowerCase() ||
    name.toLowerCase() === DEVELOPMENT_ORG_ENV_NAME.toLowerCase()
  ) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'An environment with that name already exists.',
    })
  }

  const existingSlugs = (
    existingSlug.filter(org => !!org.slug).map(org => org.slug) as string[]
  ).concat([PRODUCTION_ORG_ENV_SLUG, DEVELOPMENT_ORG_ENV_SLUG])

  return {
    slug: getCollisionSafeSlug(desiredSlug, existingSlugs),
  }
}

export const environmentsRouter = createRouter()
  .middleware(authenticatedMiddleware)
  .middleware(organizationMiddleware)
  .query('single', {
    input: z.object({
      slug: z.string().optional().default(PRODUCTION_ORG_ENV_SLUG),
    }),
    async resolve({
      ctx: { prisma, organizationId, userOrganizationAccess },
      input: { slug },
    }) {
      if (!hasPermission(userOrganizationAccess, 'ACCESS_ORG_ENVIRONMENTS')) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      let orgEnv = await prisma.organizationEnvironment.findFirst({
        where: { organizationId, slug, deletedAt: null },
      })

      if (!orgEnv) {
        if (slug === PRODUCTION_ORG_ENV_SLUG) {
          orgEnv = await prisma.organizationEnvironment.create({
            data: {
              organizationId,
              slug,
              name: PRODUCTION_ORG_ENV_NAME,
            },
          })
        } else if (slug === DEVELOPMENT_ORG_ENV_SLUG) {
          orgEnv = await prisma.organizationEnvironment.create({
            data: {
              organizationId,
              slug,
              name: DEVELOPMENT_ORG_ENV_NAME,
              color: DEVELOPMENT_ORG_DEFAULT_COLOR,
            },
          })
        } else {
          throw new TRPCError({ code: 'NOT_FOUND' })
        }
      }

      return orgEnv
    },
  })
  .mutation('create', {
    input: z.object({
      name: z.string(),
      color: z.string().nullish().default(null),
    }),
    async resolve({
      ctx: { prisma, organizationId, userOrganizationAccess },
      input: { name, color },
    }) {
      if (
        !hasPermission(userOrganizationAccess, 'ACCESS_ORG_ENVIRONMENTS') ||
        !hasPermission(userOrganizationAccess, 'WRITE_ORG_SETTINGS')
      ) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const org = await prisma.organization.findFirst({
        where: { id: organizationId },
        include: {
          environments: true,
        },
      })

      if (!org) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const prodEnv = org.environments.find(
        env =>
          env.name === PRODUCTION_ORG_ENV_NAME &&
          env.slug === PRODUCTION_ORG_ENV_SLUG
      )

      if (!prodEnv) {
        await prisma.organizationEnvironment.create({
          data: {
            name: PRODUCTION_ORG_ENV_NAME,
            slug: PRODUCTION_ORG_ENV_SLUG,
            organization: { connect: { id: organizationId } },
          },
        })
      }

      const devEnv = org.environments.find(
        env =>
          env.name === DEVELOPMENT_ORG_ENV_NAME &&
          env.slug === DEVELOPMENT_ORG_ENV_SLUG
      )

      if (!devEnv) {
        await prisma.organizationEnvironment.create({
          data: {
            name: DEVELOPMENT_ORG_ENV_NAME,
            slug: DEVELOPMENT_ORG_ENV_SLUG,
            organization: { connect: { id: organizationId } },
            color: DEVELOPMENT_ORG_DEFAULT_COLOR,
          },
        })
      }

      const { slug } = await validateEnvironment({
        prisma,
        name,
        organizationId,
      })

      return prisma.organizationEnvironment.create({
        data: {
          name,
          slug,
          color: color === 'none' ? null : color,
          organization: { connect: { id: organizationId } },
        },
      })
    },
  })
  .mutation('update', {
    input: z.object({
      id: z.string(),
      name: z.string().optional(),
      color: z.string().nullish().default(null),
    }),
    async resolve({
      ctx: { prisma, userOrganizationAccess, organizationId },
      input: { id, name, color },
    }) {
      if (
        !hasPermission(userOrganizationAccess, 'ACCESS_ORG_ENVIRONMENTS') ||
        !hasPermission(userOrganizationAccess, 'WRITE_ORG_SETTINGS')
      ) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const env = await prisma.organizationEnvironment.findFirst({
        where: { id },
      })

      if (!env) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      let slug: string | undefined
      if (
        env.slug === PRODUCTION_ORG_ENV_SLUG ||
        env.slug === DEVELOPMENT_ORG_ENV_SLUG
      ) {
        name = undefined
      } else if (name) {
        slug = (
          await validateEnvironment({
            id,
            prisma,
            name,
            organizationId,
          })
        ).slug
      }

      return prisma.organizationEnvironment.update({
        where: { id },
        data: {
          name,
          slug,
          color: color === 'none' ? null : color,
        },
      })
    },
  })
  .mutation('delete', {
    input: z.object({
      id: z.string(),
    }),
    async resolve({ ctx: { prisma, userOrganizationAccess }, input: { id } }) {
      if (
        !hasPermission(userOrganizationAccess, 'ACCESS_ORG_ENVIRONMENTS') ||
        !hasPermission(userOrganizationAccess, 'WRITE_ORG_SETTINGS')
      ) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const env = await prisma.organizationEnvironment.findFirst({
        where: { id },
      })

      if (!env) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      if (env.slug === PRODUCTION_ORG_ENV_SLUG) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot delete the production environment',
        })
      }

      if (env.slug === DEVELOPMENT_ORG_ENV_SLUG) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot delete the development environment',
        })
      }

      await prisma.apiKey.updateMany({
        where: {
          organizationEnvironmentId: env.id,
        },
        data: {
          deletedAt: new Date(),
        },
      })

      return await prisma.organizationEnvironment.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      })
    },
  })
