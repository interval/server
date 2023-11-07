import { io, Layout, Page } from '@interval/sdk-latest'
import { Prisma } from '@prisma/client'
import prisma from '~/server/prisma'

export default new Page({
  name: 'Users',
  handler: async () => {
    const thisSunday = new Date()
    thisSunday.setDate(thisSunday.getDate() - thisSunday.getDay())
    thisSunday.setHours(0, 0, 0)

    const [totalUsers, newUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: thisSunday,
          },
        },
      }),
    ])

    return new Layout({
      title: 'Users',
      children: [
        io.display.metadata('', {
          data: [
            {
              label: 'Total users',
              value: totalUsers,
            },
            {
              label: 'New this week',
              value: newUsers,
            },
          ],
        }),
        io.display.table('All users', {
          columns: [
            {
              label: 'id',
              accessorKey: 'id',
              renderCell: row => ({
                label: row.id,
                action: 'users/show',
                params: {
                  email: row.email,
                },
              }),
            },
            'firstName',
            'email',
            'defaultNotificationMethod',
            'timeZoneName',
            'createdAt',
            'updatedAt',
            'deletedAt',
          ],
          getData: async state => {
            const where: Prisma.UserWhereInput | undefined = state.queryTerm
              ? {
                  OR: [
                    {
                      id: state.queryTerm,
                    },
                    {
                      firstName: {
                        contains: state.queryTerm,
                        mode: 'insensitive',
                      },
                    },
                    {
                      lastName: {
                        contains: state.queryTerm,
                        mode: 'insensitive',
                      },
                    },
                    {
                      email: {
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
              prisma.user.findMany({
                where,
                orderBy,
                take: state.pageSize,
                skip: state.offset,
              }),
              prisma.user.count({
                where,
              }),
            ])

            return { data, totalRecords }
          },
          rowMenuItems: row => [
            {
              label: 'Disable and drop connections',
              route: 'dump_wss_state/clients/disable_user_drop_connections',
              params: { id: row.id },
              theme: 'danger',
              disabled: !!row.deletedAt,
            },
            {
              label: 'Reenable user account',
              route: 'users/reenable',
              params: { id: row.id },
              disabled: !row.deletedAt,
            },
            {
              label: 'Permanently delete',
              route: 'users/delete',
              params: { id: row.id },
              theme: 'danger',
            },
          ],
        }),
      ],
    })
  },
})
