import { io } from '@interval/sdk-latest'
import { Prisma } from '@prisma/client'

import prisma from '~/server/prisma'

export default async function searchForOrganization() {
  return io.search<Prisma.OrganizationGetPayload<{ include: { owner: true } }>>(
    'Select organization',
    {
      async onSearch(query) {
        return prisma.organization.findMany({
          where: {
            OR: [
              {
                name: {
                  search: query,
                  mode: 'insensitive',
                },
              },
              {
                name: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
            ],
          },
          include: {
            owner: true,
          },
        })
      },
      renderResult: org => ({
        value: org.id,
        label: org.name,
        description: `Owner: ${org.owner.firstName} ${org.owner.lastName} (${org.owner.email}), Slug: ${org.slug}`,
      }),
    }
  )
}
