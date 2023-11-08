import { useState, useMemo, useEffect } from 'react'
import { getName } from '~/utils/actions'
import { getNameFromStructure } from './actions'
import { trpc, inferQueryOutput } from './trpc'
import {
  ActionGroupWithPossibleMetadata,
  ActionGroupLookupResult,
  ActionMode,
  ActionWithPossibleMetadata,
  NamedActionLike,
} from './types'
import { useParams } from 'react-router-dom'
import usePrevious from './usePrevious'
import { extractOrgSlug } from '~/utils/extractOrgSlug'
import { useDashboardOptional } from '~/components/DashboardContext'

interface DashboardStructureProps {
  mode: ActionMode
  actionSlug?: string
  action?: NamedActionLike
  refetchInterval?:
    | number
    | false
    | ((
        data: inferQueryOutput<'dashboard.structure'> | undefined
      ) => number | false)
  enabled?: boolean
}

export default function useDashboardStructure({
  actionSlug,
  mode,
  action,
  refetchInterval,
  enabled,
}: DashboardStructureProps) {
  const params = useParams<{ '*': string }>()
  const dashboardContext = useDashboardOptional()

  if (!actionSlug) {
    actionSlug = params['*']
  }

  const structure = trpc.useQuery(['dashboard.structure', { mode }], {
    refetchInterval,
    enabled,
  })

  const { refetch } = structure
  useEffect(() => {
    refetch()
  }, [dashboardContext?.organizationEnvironment.id, refetch])

  const topLevelActionSlug = useMemo(
    () => actionSlug?.split('/')[0] ?? undefined,
    [actionSlug]
  )

  const currentAction = useMemo(
    () =>
      actionSlug
        ? structure.data?.actions?.find(a => a.slug === actionSlug)
        : null,
    [actionSlug, structure.data]
  )

  const actionExists = !!currentAction

  const currentPage = useMemo(
    () =>
      actionSlug
        ? structure.data?.groups.find(g => g.slug === actionSlug)
        : null,
    [actionSlug, structure.data]
  )

  const currentTopLevelPage = useMemo(
    () =>
      topLevelActionSlug
        ? structure.data?.groups.find(g => g.slug === topLevelActionSlug)
        : null,
    [topLevelActionSlug, structure.data]
  )

  const secondaryNav = useMemo(() => {
    let root: ActionGroupLookupResult | undefined
    if (currentAction?.parentSlug) {
      const parent = structure.data?.groups.find(
        g => g.slug === currentAction?.parentSlug
      )

      if (parent) {
        root = parent
      }
    } else if (currentPage) {
      root = currentPage
    }

    if (root?.parentSlug) {
      const parent = structure.data?.groups.find(
        g => g.slug === root?.parentSlug
      )

      if (parent) {
        root = parent
      }
    }

    if (root?.slug === currentAction?.parentSlug && root?.parentSlug) {
      const parent = structure.data?.groups.find(
        g => g.slug === root?.parentSlug
      )

      if (parent) {
        root = parent
      }
    }

    if (
      root?.parentSlug &&
      currentPage &&
      !currentPage.groups.length &&
      !currentPage.actions.length
    ) {
      const parent = structure.data?.groups.find(
        g => g.slug === root?.parentSlug
      )

      if (parent) {
        root = parent
      }
    }

    return root
  }, [structure.data?.groups, currentAction, currentPage])

  const pageExists = !!currentPage

  const actionTitle = useMemo((): string => {
    // title from action
    if (action) {
      return getName(action)
    }

    // title from structure
    if (actionSlug && structure.data) {
      return getNameFromStructure(actionSlug, structure.data) ?? actionSlug
    }

    return actionSlug ?? ''
  }, [action, actionSlug, structure.data])

  const hasSubnav = Boolean(
    currentTopLevelPage &&
      (currentPage !== currentTopLevelPage ||
        (currentTopLevelPage.hasHandler && currentTopLevelPage.canRun)) &&
      (!!secondaryNav?.groups.length || !!secondaryNav?.actions.length)
  )

  return {
    actionSlug,
    structure,
    currentAction,
    actionTitle,
    actionExists,
    pageExists,
    currentPage,
    currentTopLevelPage,
    secondaryNav,
    hasSubnav,
  }
}

export function useTopNavState(props: DashboardStructureProps) {
  const params = useParams()
  const { orgEnvSlug } = extractOrgSlug(params)
  const { structure } = useDashboardStructure(props)
  const [{ groups }, setGroups] = useState<{
    groups: ActionGroupWithPossibleMetadata[] | undefined
    updatedAt: number
  }>(() => ({
    groups: structure.data?.groups,
    updatedAt: structure.dataUpdatedAt,
  }))

  const prevMode = usePrevious(props.mode)
  const prevOrgEnvSlug = usePrevious(orgEnvSlug)

  useEffect(() => {
    setGroups(prev => {
      const groups = structure.data?.groups
      const now = new Date().valueOf()

      if (
        props.mode === prevMode &&
        orgEnvSlug === prevOrgEnvSlug &&
        props.mode === 'console' &&
        (groups?.length === 0 ||
          groups?.some(group =>
            group.hostInstances.some(hi => hi.isInitializing)
          )) &&
        now - prev.updatedAt < 10_000
      ) {
        return prev
      }

      return { groups, updatedAt: structure.dataUpdatedAt }
    })
  }, [
    props.mode,
    structure.data?.groups,
    structure.dataUpdatedAt,
    prevMode,
    orgEnvSlug,
    prevOrgEnvSlug,
  ])

  return groups
}

export function useSubnavState(props: DashboardStructureProps) {
  const params = useParams()
  const { orgEnvSlug } = extractOrgSlug(params)
  const [navState, setNavState] = useState<{
    hasSubnav: boolean
    title: string | undefined
    actions: ActionWithPossibleMetadata[] | undefined
    secondaryNav: ActionGroupLookupResult | undefined
  }>({
    hasSubnav: false,
    title: undefined,
    actions: undefined,
    secondaryNav: undefined,
  })

  const {
    structure,
    actionSlug,
    currentPage,
    currentTopLevelPage,
    secondaryNav,
    hasSubnav,
  } = useDashboardStructure(props)

  const prevActionSlug = usePrevious(actionSlug)
  const prevMode = usePrevious(props.mode)
  const prevOrgEnvSlug = usePrevious(orgEnvSlug)

  useEffect(() => {
    if (
      !structure.isLoading &&
      ((currentTopLevelPage &&
        currentTopLevelPage.hostInstances.every(hi => !hi.isInitializing)) ||
        hasSubnav ||
        !actionSlug ||
        actionSlug !== prevActionSlug ||
        props.mode !== prevMode ||
        orgEnvSlug !== prevOrgEnvSlug)
    ) {
      setNavState({
        title: secondaryNav?.name,
        // subnav is ignored for top-level pages without a runnable handler, since it just prints
        // the same navigation as the default grid/list group layout
        hasSubnav,
        secondaryNav,
        actions: currentTopLevelPage?.actions,
      })
    }
  }, [
    structure.isLoading,
    currentPage,
    actionSlug,
    prevActionSlug,
    currentTopLevelPage,
    secondaryNav,
    hasSubnav,
    props.mode,
    prevMode,
    orgEnvSlug,
    prevOrgEnvSlug,
  ])

  return navState
}
