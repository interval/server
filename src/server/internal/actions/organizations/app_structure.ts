import { getName } from '~/utils/actions'
import { ctx, io, Action } from '@interval/sdk-latest'
import prisma from '~/server/prisma'
import {
  getAllActionGroups,
  getAllActions,
  reconstructActionGroups,
} from '~/server/utils/actions'
import { actionScheduleToDescriptiveString } from '~/utils/actionSchedule'
import relativeTime from '~/utils/date'
import requireOrg from '../../helpers/requireOrg'

export default new Action({
  unlisted: false,
  handler: async () => {
    const org = await requireOrg()

    const prodEnv = org.environments.find(env => env.slug === null)

    if (!prodEnv) {
      throw new Error(
        `Could not find production environment for organization ${org.name}`
      )
    }

    const slugPrefix = ctx.params.slugPrefix
      ? String(ctx.params.slugPrefix)
      : undefined

    const [actions, actionGroups] = await Promise.all([
      getAllActions({
        organizationId: org.id,
        organizationEnvironmentId: prodEnv.id,
        developerId: null,
      }),
      getAllActionGroups({
        organizationId: org.id,
        organizationEnvironmentId: prodEnv.id,
        developerId: null,
      }),
    ])

    const onlineActions = actions.filter(
      act =>
        act.hostInstances.some(hi => hi.status === 'ONLINE') ||
        act.httpHosts.some(hh => hh.status === 'ONLINE')
    )

    const router = reconstructActionGroups({
      slugPrefix,
      actionGroups: Array.from(actionGroups.values()),
      actions: onlineActions,
      canConfigureActions: true,
      mode: 'live',
    })

    const items: {
      name: string
      description?: string
      slug: string
      status?: string
      permissions?: string
      schedule?: string
      transactionCount?: number
      lastRun?: string
    }[] = []

    for (const group of router.groups) {
      items.push({
        name: `📁 ${group.name}`,
        slug: group.slug,
      })
    }

    const currentLevelActions = router.actions.filter(a =>
      slugPrefix ? a.slug.startsWith(slugPrefix) : true
    )

    const transactions = await prisma.transaction.findMany({
      where: {
        action: {
          id: {
            in: currentLevelActions.map(a => a.id),
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (slugPrefix) {
      items.push({
        name: '📁 ../',
        slug: '',
      })
    }

    for (const action of currentLevelActions) {
      const actionTransactions = transactions.filter(
        tx => tx.actionId === action.id
      )

      const mostRecent = actionTransactions.length
        ? actionTransactions[0]
        : null

      items.push({
        name: getName(action),
        slug: action.slug,
        status:
          action.hostInstances.find(hi => hi.status === 'ONLINE') ||
          action.httpHosts.find(hi => hi.status === 'ONLINE')
            ? 'Online'
            : 'Offline',
        transactionCount: actionTransactions.length,
        lastRun: mostRecent ? relativeTime(mostRecent.createdAt) : '',
        description: action.description ?? '',
        permissions: action.metadata?.availability ?? '',
        schedule: action.schedules
          ?.map(actionScheduleToDescriptiveString)
          .join(' + '),
      })
    }

    const tableTitle = [
      'Dashboard',
      ...router.groupBreadcrumbs.map(g => g.name),
    ].join(' > ')

    await io.group(
      [
        io.display.table(tableTitle, {
          data: items,
          columns: [
            {
              label: 'Name',
              renderCell: row => ({
                label: row.name,
                action: row.name.includes('📁')
                  ? 'organizations/app_structure'
                  : undefined,
                params: { org: org.slug, slugPrefix: row.slug },
              }),
            },
            'slug',
            'description',
            'transactionCount',
            'lastRun',
            'status',
            'permissions',
            'schedule',
          ],
        }),
      ],
      {
        continueButton: {
          label: 'Done',
        },
      }
    )
  },
  name: 'View app structure',
  description: 'View groups & actions for an organization',
})
