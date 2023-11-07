import { io, Layout, Page } from '@interval/sdk-latest'
import { Prisma } from '@prisma/client'
import prisma from '~/server/prisma'
import orgRowMenuItems from '../../helpers/orgRowMenuItems'

export default new Page({
  name: 'Organizations',
  handler: async () => {
    const thisSunday = new Date()
    thisSunday.setDate(thisSunday.getDate() - thisSunday.getDay())
    thisSunday.setHours(0, 0, 0)

    const [totalOrgs, newOrgs] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({
        where: {
          createdAt: {
            gte: thisSunday,
          },
        },
      }),
    ])

    return new Layout({
      title: 'Organizations',
      menuItems: [
        {
          label: 'Create organization',
          action: 'organizations/create_org',
        },
      ],
      children: [
        io.display.metadata('', {
          data: [
            {
              label: 'Total organizations',
              value: totalOrgs,
            },
            {
              label: 'New this week',
              value: newOrgs,
            },
          ],
        }),
        io.display.table('All organizations', {
          getData: async state => {
            const where: Prisma.OrganizationWhereInput | undefined =
              state.queryTerm
                ? {
                    OR: [
                      {
                        id: state.queryTerm,
                      },
                      {
                        name: {
                          contains: state.queryTerm,
                          mode: 'insensitive',
                        },
                      },
                      {
                        slug: {
                          contains: state.queryTerm,
                          mode: 'insensitive',
                        },
                      },
                    ],
                  }
                : undefined

            const orderBy =
              state.sortColumn && state.sortDirection
                ? {
                    [state.sortColumn]: state.sortDirection,
                  }
                : undefined

            const [data, totalRecords] = await Promise.all([
              prisma.organization.findMany({
                where,
                orderBy,
                include: {
                  sso: {
                    select: {
                      id: true,
                      workosOrganizationId: true,
                    },
                  },
                  scimDirectory: {
                    select: {
                      id: true,
                      workosDirectoryId: true,
                    },
                  },
                },
                take: state.pageSize,
                skip: state.offset,
              }),
              prisma.organization.count({
                where,
              }),
            ])

            return { data, totalRecords }
          },
          columns: [
            {
              label: 'Name',
              accessorKey: 'name',
            },
            {
              label: 'Slug',
              accessorKey: 'slug',
            },
            {
              label: 'SSO',
              renderCell: row => row.sso?.workosOrganizationId,
            },
            {
              label: 'SCIM Directory',
              renderCell: row => row.scimDirectory?.workosDirectoryId,
            },
          ],
          rowMenuItems: orgRowMenuItems,
        }),
      ],
    })
  },
})
