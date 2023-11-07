import { ctx, io, Layout, Page } from '@interval/sdk-latest'
import { z } from 'zod'
import prisma from '~/server/prisma'
import { EXPOSED_ROLES } from '~/utils/permissions'
import requireOrg from '../../helpers/requireOrg'
import selectUser from '../../helpers/selectUser'

async function getUserAndOrg() {
  const organization = await requireOrg('organizationSlug')

  const { userId } = z
    .object({
      userId: z.string().optional(),
    })
    .parse(ctx.params)

  const user = userId
    ? await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    : await selectUser()

  return {
    user,
    organization,
  }
}

const userPage = new Page({
  name: 'User',
  unlisted: true,
  actions: {
    remove_from_org: {
      name: 'Remove from organization',
      handler: async () => {
        const { user, organization } = await getUserAndOrg()

        let isConfirmed = await io.confirmIdentity(
          `Before removing a user, please confirm your identity.`
        )

        if (!isConfirmed) return 'Identity not confirmed'

        isConfirmed = await io.confirm(
          `Remove ${user.firstName} ${user.lastName} from ${organization.name}?`
        )

        if (!isConfirmed) return 'Cancelled'

        await prisma.userOrganizationAccess.delete({
          where: {
            userId_organizationId: {
              userId: user.id,
              organizationId: organization.id,
            },
          },
        })

        return {
          organizationId: organization.id,
          userId: user.id,
        }
      },
    },
    add_to_org: {
      name: 'Add to organization',
      handler: async () => {
        const { user, organization } = await getUserAndOrg()

        const role = await io.select.single('Role', {
          options: EXPOSED_ROLES,
        })

        const isConfirmed = await io.confirmIdentity(
          `Before adding a user, please confirm your identity.`
        )

        if (!isConfirmed) return 'Identity not confirmed'

        const createdRow = await prisma.userOrganizationAccess.create({
          data: {
            userId: user.id,
            organizationId: organization.id,
            permissions: [role],
          },
        })

        return createdRow as any
      },
    },
  },
  handler: async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: {
        email: String(ctx.params.email),
      },
      include: {
        userOrganizationAccess: {
          include: {
            organization: true,
          },
        },
        organizations: true,
        transactions: {
          include: {
            action: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    const basicInfo = Object.entries(user)
      .map(([k, v]) => ({
        label: String(k),
        value: v,
      }))
      .filter(
        row =>
          !['password'].includes(row.label) && typeof row.value !== 'object'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any

    return new Layout({
      title: `${user.firstName} ${user.lastName}`,
      menuItems: [
        {
          label: 'Add to organization',
          action: 'users/show/add_to_org',
          params: {
            userId: user.id,
          },
        },
        {
          label: 'Disable and drop connections',
          route: 'dump_wss_state/clients/disable_user_drop_connections',
          params: { id: user.id },
          theme: 'danger',
          disabled: !!user.deletedAt,
        },
        {
          label: 'Reenable user account',
          route: 'users/reenable',
          params: { id: user.id },
          disabled: !user.deletedAt,
        },
        {
          label: 'Permanently delete',
          route: 'users/delete',
          params: { id: user.id },
          theme: 'danger',
        },
      ],
      children: [
        io.display.metadata('Details', {
          layout: 'list',
          data: basicInfo,
        }),
        io.display.table(`Organizations ${user.firstName} belongs to`, {
          data: user.userOrganizationAccess.map(oa => ({
            ...oa.organization,
            role: oa.permissions.toString(),
          })),
          columns: ['id', 'name', 'slug', 'role'],
          rowMenuItems: row => [
            {
              label: 'Remove from org',
              action: 'users/show/remove_from_org',
              params: {
                organizationSlug: row.slug,
                userId: user.id,
              },
            },
          ],
        }),
        io.display.table(`Organizations owned by ${user.firstName}`, {
          data: user.organizations,
          columns: ['id', 'name', 'slug'],
          rowMenuItems: row => [
            {
              label: 'Remove from org',
              action: 'users/show/remove_from_org',
              params: {
                organizationSlug: row.slug,
                userId: user.id,
              },
            },
          ],
        }),
        io.display.table('Recent transactions', {
          data: user.transactions.map(t => ({
            id: t.id,
            actionSlug: t.action.slug,
            actionName: t.action.name,
            status: t.status,
            createdAt: t.createdAt,
            completedAt: t.completedAt,
          })),
        }),
      ],
    })
  },
})

export default userPage
