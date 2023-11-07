import { useRegisterActions } from 'kbar'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import useEnvSwitcher from '~/utils/useOrgEnvSwitcher'
import { useOrgParams } from '~/utils/organization'
import { useOrganization } from '../DashboardContext'
import { trpc, client } from '~/utils/trpc'
import { getGroupSlug, getBaseSlug } from '~/utils/actions'
import { useMe } from '../MeContext'

type SearchOption = {
  id: string
  slug: string
  parent: string
  actionId?: string
  link?: string
  name?: string
  subtitle?: string
}

export const ACTION_UNREACHABLE_MESSAGE = 'Action is unreachable'
export const VIEW_ONLY_MESSAGE = 'You only have view access for this action'
export const COMMAND_BAR_INPUT_ID = 'command-search'

export default function useCommandBarActions() {
  const { orgSlug, envSlug, orgEnvSlug, isDevMode } = useOrgParams()
  const organization = useOrganization()
  const navigate = useNavigate()
  const { me } = useMe()

  const mode = isDevMode ? 'console' : 'live'

  const { data } = trpc.useQuery(
    // `key` prevents this query from refetching when `dashboard.structure` is polled in dev mode.
    // providing a custom key in the options object doesn't seem to work for some reason.
    ['dashboard.structure', { mode, key: 'kbar' }]
  )

  const basePath = `/dashboard/${orgEnvSlug}/${
    isDevMode ? 'develop/' : ''
  }actions`

  const topLevelGroups = useMemo(() => {
    if (!data) return []

    return data?.groups
      .filter(g => !g.slug.includes('/'))
      .map(g => ({
        id: `group-${g.slug}`,
        name: g.name,
        slug: g.slug,
        link: `${basePath}/${g.slug}`,
        subtitle: g.description,
        parent: getGroupSlug(g.slug)
          ? `group-${getGroupSlug(g.slug)}`
          : 'search-actions',
        section: 'Navigation',
      }))
  }, [data, basePath])

  const searchOptions: SearchOption[] = useMemo(() => {
    const groups = data?.groups || []
    const groupOptions: SearchOption[] = groups.map(group => ({
      id: `group-${group.slug}`,
      name: group.name,
      slug: group.slug,
      link: `${basePath}/${group.slug}`,
      subtitle: group.description || undefined,
      parent: getGroupSlug(group.slug)
        ? `group-${getGroupSlug(group.slug)}`
        : 'search-actions',
    }))
    const actions = data?.actions ?? []
    return groupOptions.concat(
      actions.map(action => {
        let link: string | undefined = undefined
        if (action.canRun && action.status === 'ONLINE') {
          link = `${basePath}/${action.slug}`
        } else if (action.canConfigure) {
          link = `/dashboard/${orgEnvSlug}/configure/${action.slug}`
        }
        const groupSlug = getGroupSlug(action.slug)
        return {
          id: action.id,
          slug: action.slug,
          parent:
            groupSlug && groupOptions.find(g => g.slug === groupSlug)
              ? `group-${getGroupSlug(action.slug)}`
              : 'search-actions',
          link,
          name: action.name || undefined,
          subtitle: action.description || undefined,
        }
      })
    )
  }, [data, basePath, orgEnvSlug])

  const mostUsedActions = useMemo(() => {
    const mostUsedActions: SearchOption[] = []
    if (data) {
      for (const m of data.mostUsedActions) {
        const action = searchOptions.find(o => o.id === m.actionId)
        if (action) {
          mostUsedActions.push(action)
        }
      }
    }

    return mostUsedActions
  }, [data, searchOptions])

  const otherOrgs =
    me?.userOrganizationAccess.map(access => ({
      slug: access.organization.slug,
      name: access.organization.name,
      isCurrent: access.organization.slug === orgSlug,
    })) ?? []

  const { switchToEnvironment, envOptions } = useEnvSwitcher({
    organization,
    orgEnvSlug,
    envSlug,
  })

  useRegisterActions(
    [
      ...mostUsedActions.map((action, i) => ({
        id: `most-used-action-${i}`,
        name: action.name ?? action.slug,
        perform: () => {
          if (action.link) {
            navigate(action.link)
          }
        },
        subtitle: action.subtitle,
        section: 'Commonly used actions',
      })),
      {
        id: 'actions',
        name: 'Dashboard',
        perform: () => {
          navigate(basePath)
        },
        shortcut: ['g', 'h'],
        section: 'Navigation',
      },
      ...topLevelGroups.map((group, i) => ({
        id: `top-level-group-${i}`,
        name: group.name,
        perform: () => {
          navigate(group.link)
        },
        section: 'Navigation',
      })),
      ...searchOptions.map(action => ({
        id: action.id,
        name: action.name ?? getBaseSlug(action.slug),
        perform: () => {
          if (action.link) {
            navigate(action.link)
          }
        },
        subtitle: action.subtitle,
        parent: action.parent,
        keywords: [...action.slug.split('/'), action.name ?? ''].join(' '),
      })),
      ...envOptions
        .filter(env => !env.isCurrent)
        .map(env => ({
          id: `env-${env.path}`,
          name: `Switch to ${env.name} environment`,
          perform: () => {
            // for type safety, only possible on pages without a slug that redirect
            if (!orgEnvSlug || !orgSlug) return
            switchToEnvironment(env.path)
          },
          section: 'Environments',
        })),
      ...otherOrgs
        .filter(org => !org.isCurrent)
        .map(org => ({
          id: `org-${org.slug}`,
          name: `Switch to ${org.name} organization`,
          perform: () => window.location.assign(`/dashboard/${org.slug}`),
          section: 'Organizations',
        })),
      {
        id: 'settings',
        name: 'Settings',
        shortcut: ['g', 's'],
        section: 'Interval',
      },
      {
        id: 'account-settings',
        name: 'Account settings',
        perform: () => {
          navigate(`/dashboard/${orgSlug}/account`)
        },
        parent: 'settings',
      },
      {
        id: 'organization-settings',
        name: 'Organization settings',
        perform: () => {
          navigate(`/dashboard/${orgSlug}/organization/settings`)
        },
        parent: 'settings',
      },
      {
        id: 'users',
        name: 'Users',
        perform: () => {
          navigate(`/dashboard/${orgSlug}/organization/users`)
        },
        parent: 'settings',
      },
      {
        id: 'teams',
        name: 'Teams',
        perform: () => {
          navigate(`/dashboard/${orgSlug}/organization/teams`)
        },
        parent: 'settings',
      },
      {
        id: 'history',
        name: 'History',
        perform: () => {
          navigate(`/dashboard/${orgSlug}/transactions`)
        },
        parent: 'settings',
      },
      {
        id: 'docs',
        name: 'Documentation',
        perform: () => {
          window.open('https://interval.com/docs', '_blank')
        },
        section: 'Interval',
      },
    ],
    [
      mostUsedActions,
      searchOptions,
      organization.environments,
      navigate,
      envSlug,
      orgSlug,
      orgEnvSlug,
      otherOrgs,
    ]
  )
}
