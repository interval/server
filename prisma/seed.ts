import { faker } from '@faker-js/faker'
import { Prisma, PrismaClient } from '@prisma/client'
import { encryptPassword } from '~/server/auth'
import {
  DEVELOPMENT_ORG_DEFAULT_COLOR,
  DEVELOPMENT_ORG_ENV_NAME,
  DEVELOPMENT_ORG_ENV_SLUG,
  PRODUCTION_ORG_ENV_NAME,
  PRODUCTION_ORG_ENV_SLUG,
} from '~/utils/environments'

const prisma = new PrismaClient()

const ADMIN_USER_ID = 'Z-bMgZZ1IY1NkgwYzE1n6'
const ADMIN_USER_EMAIL = 'admin@interval.com'
const ADMIN_USER_PASSWORD = 'password'

function upsertUser(details: Prisma.UserCreateInput) {
  return prisma.user.upsert({
    create: {
      ...details,
    },
    update: {
      ...details,
    },
    where: {
      email: details.email,
    },
  })
}

function upsertApiKey(details: Prisma.ApiKeyCreateInput) {
  return prisma.apiKey.upsert({
    create: {
      ...details,
    },
    update: {
      ...details,
    },
    where: {
      id: details.id,
    },
  })
}

function upsertOrg(details: Prisma.OrganizationCreateInput) {
  return prisma.organization.upsert({
    create: {
      ...details,
    },
    update: {
      ...details,
    },
    where: {
      id: details.id,
    },
    include: {
      environments: true,
    },
  })
}

function upsertOrgSSO(details: Prisma.OrganizationSSOCreateInput) {
  return prisma.organizationSSO.upsert({
    create: {
      ...details,
    },
    update: {
      ...details,
    },
    where: {
      id: details.id,
    },
  })
}

function createUserOrgAccess(
  details: Prisma.UserOrganizationAccessCreateInput
) {
  return prisma.userOrganizationAccess.create({
    data: {
      ...details,
    },
  })
}

function upsertUserAccessGroup(details: Prisma.UserAccessGroupCreateInput) {
  return prisma.userAccessGroup.upsert({
    create: {
      ...details,
    },
    update: {
      ...details,
    },
    where: {
      id: details.id,
    },
  })
}

function createUserAccessGroupMembership(
  details: Prisma.UserAccessGroupMembershipCreateInput
) {
  return prisma.userAccessGroupMembership.create({
    data: {
      ...details,
    },
  })
}

function upsertHostInstance(details: Prisma.HostInstanceCreateInput) {
  return prisma.hostInstance.upsert({
    create: {
      ...details,
    },
    update: {
      ...details,
    },
    where: {
      id: details.id,
    },
  })
}

function upsertAction(details: Prisma.ActionCreateInput) {
  return prisma.action.upsert({
    create: {
      ...details,
    },
    update: {
      ...details,
    },
    where: {
      id: details.id,
    },
  })
}

function upsertActionMetadata(details: Prisma.ActionMetadataCreateInput) {
  return prisma.actionMetadata.upsert({
    create: {
      ...details,
    },
    update: {
      ...details,
    },
    where: {
      id: details.id,
    },
  })
}

const API_KEYS = {
  acme: {
    dev: 'admin_dev_kcLjzxNFxmGLf0aKtLVhuckt6sziQJtxFOdtM19tBrMUp5mj',
    live: 'live_N47qd1BrOMApNPmVd0BiDZQRLkocfdJKzvt8W6JT5ICemrAN',
  },
  interval: {
    dev: 'admin_dev_lASZF4q7JKGjNNEc2aKNDMSXTDZ4liOa9CCSeBTteZyo458A',
    live: 'live_32c17AqIKOdH0X0hGmR7Vnd9CYNDQLG585504uIm0AUaAgUf',
  },
}

/**
 * Creates an organization for local development.
 */
async function createDevOrg() {
  console.log('Creating dev org...')

  await upsertUser({
    id: ADMIN_USER_ID,
    email: ADMIN_USER_EMAIL,
    password: encryptPassword(ADMIN_USER_PASSWORD),
    firstName: 'Admin',
    lastName: 'User',
  })

  const acme = await upsertOrg({
    id: 'RQ1FQoNTFCYe-W8RTGF1u',
    slug: 'acme-corp',
    name: 'Acme Corp',
    owner: {
      connect: {
        id: ADMIN_USER_ID,
      },
    },
    private: { create: {} },
    environments: {
      create: [
        { slug: PRODUCTION_ORG_ENV_SLUG, name: PRODUCTION_ORG_ENV_NAME },
        {
          slug: DEVELOPMENT_ORG_ENV_SLUG,
          name: DEVELOPMENT_ORG_ENV_NAME,
          color: DEVELOPMENT_ORG_DEFAULT_COLOR,
        },
      ],
    },
  })

  // make this org the default org for the new user
  const now = new Date()
  now.setSeconds(now.getSeconds() + 2)

  await createUserOrgAccess({
    user: { connect: { id: ADMIN_USER_ID } },
    organization: { connect: { id: acme.id } },
    permissions: ['ADMIN'],
    lastSwitchedToAt: now,
  })

  await upsertApiKey({
    id: 'gfVYGr9AhZBni3TT_N5L0',
    key: API_KEYS.acme.dev,
    user: {
      connect: {
        id: ADMIN_USER_ID,
      },
    },
    usageEnvironment: 'DEVELOPMENT',
    organization: {
      connect: {
        id: acme.id,
      },
    },
    organizationEnvironment: {
      connect: {
        id: acme.environments.find(env => env.slug === DEVELOPMENT_ORG_ENV_SLUG)
          ?.id,
      },
    },
  })

  await upsertApiKey({
    id: 'fzlGEIA93Yf27FgB2WAAQ',
    key: encryptPassword(API_KEYS.acme.live),
    user: {
      connect: {
        id: ADMIN_USER_ID,
      },
    },
    usageEnvironment: 'PRODUCTION',
    organization: {
      connect: {
        id: acme.id,
      },
    },
    organizationEnvironment: {
      connect: {
        id: acme.environments.find(env => env.slug === PRODUCTION_ORG_ENV_SLUG)
          ?.id,
      },
    },
  })

  const otherUsers: [string, string][] = Array.from({ length: 10 }).map(() => {
    return [faker.name.firstName(), faker.name.lastName()]
  })

  const users = await Promise.all([
    ...otherUsers.map(([firstName, lastName]) =>
      upsertUser({
        password: encryptPassword('password'),
        email: `${firstName.toLowerCase()}@interval.com`,
        firstName,
        lastName,
      })
    ),
    // ACTION_RUNNER-level user in the Support group
    upsertUser({
      password: encryptPassword('password'),
      email: 'support@interval.com',
      firstName: 'Support',
      lastName: 'User',
    }),
    // DEVELOPER-level user in the Engineers group
    upsertUser({
      password: encryptPassword('password'),
      email: 'engineers@interval.com',
      firstName: 'Engineers',
      lastName: 'User',
    }),
  ])

  const engGroup = await upsertUserAccessGroup({
    name: 'Engineers',
    slug: 'engineers',
    organization: { connect: { id: acme.id } },
    id: 'uR81EKV0sEVeV0brFSTaD',
  })

  const supportGroup = await upsertUserAccessGroup({
    name: 'Support',
    slug: 'support',
    organization: { connect: { id: acme.id } },
    id: 'jNb18gzlCKMYFcr98jZM0',
  })

  for (let i = 0; i < users.length; i++) {
    const user = users[i]

    if (user.firstName === 'Support') {
      const access = await createUserOrgAccess({
        user: { connect: { id: user.id } },
        organization: { connect: { id: acme.id } },
        permissions: ['ACTION_RUNNER'],
      })

      await createUserAccessGroupMembership({
        userOrganizationAccess: { connect: { id: access.id } },
        group: { connect: { id: supportGroup.id } },
      })
    } else if (user.firstName === 'Engineers') {
      const access = await createUserOrgAccess({
        user: { connect: { id: user.id } },
        organization: { connect: { id: acme.id } },
        permissions: ['DEVELOPER'],
      })

      await createUserAccessGroupMembership({
        userOrganizationAccess: { connect: { id: access.id } },
        group: { connect: { id: engGroup.id } },
      })
    } else if (i <= 5) {
      const access = await createUserOrgAccess({
        user: { connect: { id: user.id } },
        organization: { connect: { id: acme.id } },
        permissions: ['DEVELOPER'],
      })

      await createUserAccessGroupMembership({
        userOrganizationAccess: { connect: { id: access.id } },
        group: { connect: { id: engGroup.id } },
      })
    } else {
      const access = await createUserOrgAccess({
        user: { connect: { id: user.id } },
        organization: { connect: { id: acme.id } },
        permissions: ['ACTION_RUNNER'],
      })

      await createUserAccessGroupMembership({
        userOrganizationAccess: { connect: { id: access.id } },
        group: { connect: { id: supportGroup.id } },
      })
    }
  }
}

/**
 * Creates an internal "Interval" organization containing actions for
 * managing the Interval instance.
 */
async function createIntervalOrg() {
  console.log('Creating internal Interval org...')

  const interval = await upsertOrg({
    name: 'Interval',
    owner: {
      connect: {
        id: ADMIN_USER_ID,
      },
    },
    private: { create: {} },
    id: 'URobaKdFwHieImSKFO37D',
    slug: 'interval',
    environments: {
      create: [
        { slug: PRODUCTION_ORG_ENV_SLUG, name: PRODUCTION_ORG_ENV_NAME },
        {
          slug: DEVELOPMENT_ORG_ENV_SLUG,
          name: DEVELOPMENT_ORG_ENV_NAME,
          color: DEVELOPMENT_ORG_DEFAULT_COLOR,
        },
      ],
    },
  })

  await upsertApiKey({
    id: 'J91ACL455qSsHtp6x-QJB',
    key: API_KEYS.interval.dev,
    user: {
      connect: {
        id: ADMIN_USER_ID,
      },
    },
    usageEnvironment: 'DEVELOPMENT',
    organization: {
      connect: {
        id: interval.id,
      },
    },
    organizationEnvironment: {
      connect: {
        id: interval.environments.find(
          env => env.slug === DEVELOPMENT_ORG_ENV_SLUG
        )?.id,
      },
    },
  })

  await upsertApiKey({
    id: 'qhykubq7PUAGHnVv-xDh6',
    key: encryptPassword(API_KEYS.interval.live),
    user: {
      connect: {
        id: ADMIN_USER_ID,
      },
    },
    usageEnvironment: 'PRODUCTION',
    organization: {
      connect: {
        id: interval.id,
      },
    },
    organizationEnvironment: {
      connect: {
        id: interval.environments.find(
          env => env.slug === PRODUCTION_ORG_ENV_SLUG
        )?.id,
      },
    },
  })

  await createUserOrgAccess({
    user: { connect: { id: ADMIN_USER_ID } },
    organization: { connect: { id: interval.id } },
    permissions: ['ADMIN'],
  })
}

async function main() {
  await createDevOrg()
  await createIntervalOrg()
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
  .catch(e => {
    console.error('Error disconnecting:', e)
  })
