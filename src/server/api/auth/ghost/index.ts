import { CREATE_GHOST_MODE_ACCOUNT } from '@interval/sdk/dist/internalRpcSchema'
import { Prisma, ApiKey, Organization, User } from '@prisma/client'
import { Request, Response, Router } from 'express'
import { z } from 'zod'
import { generateKey } from '~/server/auth'
import { isFlagEnabled } from '~/server/utils/featureFlags'
import {
  DEVELOPMENT_ORG_ENV_NAME,
  DEVELOPMENT_ORG_ENV_SLUG,
  PRODUCTION_ORG_ENV_NAME,
  PRODUCTION_ORG_ENV_SLUG,
} from '~/utils/environments'
import prisma from '../../../prisma'
import generateRandomSlug from './generateRandomSlug'

const anonRouter = Router()

interface GhostOrgDetails {
  user: User
  apiKey: ApiKey
  organization: Organization
}

async function createGhostApiKey(
  org: Prisma.OrganizationGetPayload<{
    include: {
      owner: true
      environments: true
    }
  }>
) {
  const orgEnv = org.environments.find(
    env => env.slug === DEVELOPMENT_ORG_ENV_SLUG
  )
  if (!orgEnv) {
    throw new Error('Development organizationEnvironment not found')
  }
  const apiKey = await prisma.apiKey.create({
    data: {
      isGhostMode: true,
      userId: org.owner.id,
      organizationId: org.id,
      usageEnvironment: 'DEVELOPMENT',
      key: generateKey(org.owner, 'DEVELOPMENT'),
      organizationEnvironmentId: orgEnv.id,
    },
  })
  return apiKey
}

async function createGhostOrg(id?: string) {
  const slug = generateRandomSlug()

  const org = await prisma.organization.create({
    data: {
      id,
      name: slug,
      isGhostMode: true,
      slug,
      owner: {
        create: {
          isGhostMode: true,
          email: `${slug}@example.com`,
        },
      },
      environments: {
        createMany: {
          data: [
            { name: PRODUCTION_ORG_ENV_NAME, slug: PRODUCTION_ORG_ENV_SLUG },
            { name: DEVELOPMENT_ORG_ENV_NAME, slug: DEVELOPMENT_ORG_ENV_SLUG },
          ],
        },
      },
    },
    include: {
      owner: true,
      environments: true,
    },
  })

  const apiKey = await createGhostApiKey(org)

  return { ...org, apiKey }
}

export async function findOrCreateGhostOrg(
  id?: string
): Promise<GhostOrgDetails> {
  if (id) {
    const org = await prisma.organization.findUnique({
      where: { id },
      include: { owner: true, apiKeys: true, environments: true },
    })

    if (org) {
      if (!org.isGhostMode) {
        throw new Error(
          `The organization with id ${org.id} is not a ghost mode org`
        )
      }

      let apiKey = org.apiKeys[0]

      if (!apiKey) {
        apiKey = await createGhostApiKey(org)
      }

      return {
        organization: org,
        user: org.owner,
        apiKey,
      }
    }
  }
  const organization = await createGhostOrg(id)
  return {
    organization,
    user: organization.owner,
    apiKey: organization.apiKey,
  }
}

anonRouter.post('/create', async (req: Request, res: Response) => {
  const ghostModeEnabled = await isFlagEnabled('GHOST_MODE_ENABLED')
  if (!ghostModeEnabled) {
    return res.sendStatus(404)
  }

  const org = await createGhostOrg()

  const resp: z.infer<typeof CREATE_GHOST_MODE_ACCOUNT.returns> = {
    ghostOrgId: org.id,
  }

  return res.json(resp)
})

export default anonRouter
