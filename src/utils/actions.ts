import type { SerializableRecord } from '@interval/sdk/dist/ioSchema'
import type { Location } from 'react-router-dom'
import type {
  ActionMode,
  ActionWithPossibleMetadata,
  NamedActionLike,
  ActionSearchResult,
} from './types'
import type {
  ActionGroup,
  UsageEnvironment,
  HostInstanceStatus,
  HostInstance,
  HttpHost,
  ActionAccessLevel,
  ActionAccess,
  ActionGroupAccess,
  Prisma,
  ActionGroupMetadata,
} from '@prisma/client'
import { useCallback } from 'react'
import { useOrgParams } from './organization'
import { getOrgEnvSlug } from './environments'

export const SLUG_VALID_TEXT =
  'Action slugs must contain only letters, numbers, underscores, periods, and hyphens.'

export function sortByName(actions: NamedActionLike[]) {
  actions.sort(nameSorter)
}

export function getName(
  action: Pick<NamedActionLike, 'name' | 'slug'> & {
    metadata?: { name?: string | null } | null | ActionGroupMetadata
  }
): string {
  return (
    (action.metadata && 'name' in action.metadata
      ? action.metadata?.name
      : undefined) ??
    action.name ??
    getNameFromSlug(action.slug)
  )
}

export function getNameFromSlug(slug: string): string {
  return slug.split('/').slice(-1)[0]
}

export function getNameFromStructure(
  slug: string,
  structure: { actions: ActionSearchResult[] }
) {
  const action = structure.actions.find(a => a.slug === slug)

  if (!action) return null

  return getName(action)
}

const STATUS_ORDERS = ['ONLINE', 'UNREACHABLE', 'OFFLINE']
/** Assumes already sorted by createdAt in DB query */
export function hostSorter<H extends { status: HostInstanceStatus }>(
  h1: H,
  h2: H
) {
  const s1 = STATUS_ORDERS.indexOf(h1.status)
  const s2 = STATUS_ORDERS.indexOf(h2.status)

  return s1 - s2
}

export function getStatus(actionOrGroup: {
  hostInstances: Pick<HostInstance, 'status'>[]
  httpHosts: Pick<HttpHost, 'status'>[]
}): HostInstanceStatus | undefined {
  return (
    actionOrGroup.hostInstances[0]?.status ?? actionOrGroup.httpHosts[0]?.status
  )
}

export function getDescription(
  action: ActionWithPossibleMetadata
): string | null {
  return action.metadata?.description ?? action.description
}

function nameSorter(a: NamedActionLike, b: NamedActionLike) {
  const aName = getName(a).toLowerCase()
  const bName = getName(b).toLowerCase()

  if (aName < bName) return -1
  if (aName > bName) return 1
  return 0
}

export function groupSorter(a: ActionGroup, b: ActionGroup) {
  if (b.slug.includes(a.slug)) return -1
  if (a.slug.includes(b.slug)) return 1

  const aName = a.name.toLowerCase()
  const bName = b.name.toLowerCase()

  if (aName < bName) return -1
  if (aName > bName) return 1
  return 0
}

export function actionAccessHasLevel(
  access: ActionAccess | ActionGroupAccess,
  accessLevel: ActionAccessLevel
) {
  const { level } = access

  switch (accessLevel) {
    case 'ADMINISTRATOR':
      return level === 'ADMINISTRATOR'
    case 'RUNNER':
      return level === 'RUNNER' || level === 'ADMINISTRATOR'
    case 'VIEWER':
      return (
        level === 'VIEWER' || level === 'RUNNER' || level === 'ADMINISTRATOR'
      )
  }
}

/**
 * Determines whether the user can run the given action.
 * Does not check whether the user can run actions at all, do that elsewhere.
 *
 * Relies on the backend only returning their own development actions, and
 * only returning the user's own ActionAccesses.
 *
 * Returns `undefined` if availability is set to ORGANIZATION, as access
 * may be inherited by a parent group.
 */
function userCanAccessAction(
  action: Prisma.ActionGetPayload<{
    include: { metadata: { include: { accesses: true } } }
  }>,
  accessLevel: ActionAccessLevel
): boolean | undefined {
  // Should only receive own from backend
  if (action.developerId) return true

  if (action.metadata?.archivedAt) return false

  switch (action.metadata?.availability) {
    case undefined:
    case null:
      return undefined
    case 'ORGANIZATION':
      return true
    case 'GROUPS':
      return (
        action.metadata.accesses.some(access =>
          actionAccessHasLevel(access, accessLevel)
        ) ?? false
      )
  }
}

/**
 * Determines whether the user can run the given action group.
 * Does not check whether the user can run actions at all, do that elsewhere.
 *
 * Relies on the backend only returning their own development actions, and
 * only returning the user's own ActionAccesses
 *
 * Returns `undefined` if availability is set to ORGANIZATION, as access
 * may be inherited by a parent group.
 */
export function userCanAccessActionGroup(
  actionGroup: Prisma.ActionGroupGetPayload<{
    include: { metadata: { include: { accesses: true } } }
  }>,
  accessLevel: ActionAccessLevel
): boolean | undefined {
  // Should only receive own from backend
  if (actionGroup.developerId) return true

  switch (actionGroup.metadata?.availability) {
    case undefined:
    case null:
      return undefined
    case 'ORGANIZATION':
      return true
    case 'GROUPS':
      return actionGroup.metadata.accesses.some(access =>
        actionAccessHasLevel(access, accessLevel)
      )
  }
}

function getInheritedAccess(
  groupsMap: Map<
    string,
    Prisma.ActionGroupGetPayload<{
      include: { metadata: { include: { accesses: true } } }
    }>
  >,
  slug: string,
  accessLevel: ActionAccessLevel
): boolean | undefined {
  const group = groupsMap.get(slug)
  const groupAccess = group && userCanAccessActionGroup(group, 'RUNNER')

  if (group && groupAccess !== undefined) {
    return groupAccess
  }

  if (slug.includes('/')) {
    return getInheritedAccess(
      groupsMap,
      slug.slice(0, slug.lastIndexOf('/')),
      accessLevel
    )
  }

  return undefined
}

export function getActionAccessLevel({
  action,
  groupsMap,
}: {
  action: Prisma.ActionGetPayload<{
    include: { metadata: { include: { accesses: true } } }
  }>
  groupsMap: Map<
    string,
    Prisma.ActionGroupGetPayload<{
      include: { metadata: { include: { accesses: true } } }
    }>
  >
}): { canRun: boolean; canView: boolean } {
  const actionRunPermission = userCanAccessAction(action, 'RUNNER')
  const actionViewPermission = userCanAccessAction(action, 'VIEWER')

  const inheritedRunPermission = getInheritedAccess(
    groupsMap,
    action.slug,
    'RUNNER'
  )
  const inheritedViewPermission = getInheritedAccess(
    groupsMap,
    action.slug,
    'VIEWER'
  )

  // action-level permissions take precedence over permissions inherited from groups
  if (actionRunPermission !== undefined) {
    return {
      canRun: actionRunPermission,
      canView: actionViewPermission ?? actionRunPermission,
    }
  }

  if (inheritedRunPermission !== undefined) {
    return {
      canRun: inheritedRunPermission,
      canView: inheritedViewPermission ?? inheritedRunPermission,
    }
  }

  // undefined all the way up the tree; assume access to be true
  return { canRun: true, canView: true }
}

export function getActionGroupAccessLevel({
  group,
  groupsMap,
}: {
  group: Prisma.ActionGroupGetPayload<{
    include: { metadata: { include: { accesses: true } } }
  }>
  groupsMap: Map<
    string,
    Prisma.ActionGroupGetPayload<{
      include: { metadata: { include: { accesses: true } } }
    }>
  >
}): { canRun: boolean; canView: boolean } {
  const groupRunPermission = userCanAccessActionGroup(group, 'RUNNER')
  const groupViewPermission = userCanAccessActionGroup(group, 'VIEWER')
  const inheritedRunPermission = getInheritedAccess(
    groupsMap,
    group.slug,
    'RUNNER'
  )
  const inheritedViewPermission = getInheritedAccess(
    groupsMap,
    group.slug,
    'VIEWER'
  )

  if (groupRunPermission !== undefined) {
    return {
      canRun: groupRunPermission,
      canView: groupViewPermission ?? groupRunPermission,
    }
  }

  if (inheritedRunPermission !== undefined) {
    return {
      canRun: inheritedRunPermission,
      canView: inheritedViewPermission ?? inheritedRunPermission,
    }
  }

  // undefined all the way up the tree; assume access to be true
  return { canRun: true, canView: true }
}

/**
 * Use history state to get queuedActionId to not clobber any
 * user-set search params.
 */
export function getQueuedActionId(location: Location): string | undefined {
  const state = location.state
  if (
    state &&
    typeof state === 'object' &&
    !Array.isArray(state) &&
    'queuedActionId' in state
  ) {
    const newState = state as { queuedActionId: unknown }
    if (typeof newState.queuedActionId === 'string') {
      return newState.queuedActionId
    }
  }
}

export function getFullActionSlug({
  groupSlug,
  slug,
}: {
  groupSlug?: string
  slug: string
}): string {
  let fullSlug = [groupSlug, slug].join('/')
  if (fullSlug.startsWith('/')) {
    fullSlug = fullSlug.substring(1)
  }

  return fullSlug
}

export function getGroupSlug(fullSlug: string): string | undefined {
  if (!fullSlug.includes('/')) {
    return undefined
  }

  return fullSlug.substring(0, fullSlug.lastIndexOf('/'))
}

export function getBaseSlug(fullSlug: string): string {
  if (!fullSlug.includes('/')) {
    return fullSlug
  }

  const baseSlug = fullSlug.substring(
    fullSlug.lastIndexOf('/'),
    fullSlug.length
  )

  if (baseSlug.startsWith('/')) {
    return baseSlug.substring(1)
  }

  return baseSlug
}

export function usageEnvironmentToMode(
  usageEnvironment: UsageEnvironment | 'ANON_CONSOLE'
): ActionMode | 'anon-console' {
  switch (usageEnvironment) {
    case 'ANON_CONSOLE':
      return 'anon-console'
    case 'PRODUCTION':
      return 'live'
    case 'DEVELOPMENT':
      return 'console'
  }
}

export function getDashboardPath({
  mode,
  ...props
}: {
  mode: ActionMode | 'anon-console'
} & (
  | {
      orgEnvSlug: string
    }
  | {
      orgSlug: string
      envSlug: string | undefined | null
    }
)): string {
  if ('orgEnvSlug' in props) {
    switch (mode) {
      case 'live':
        return `/dashboard/${props.orgEnvSlug}/actions`
      case 'console':
        return `/dashboard/${props.orgEnvSlug}/develop/actions`
      case 'anon-console':
        return `/develop/${props.orgEnvSlug}/actions`
    }
  }

  const orgEnvSlug = getOrgEnvSlug(props.envSlug, props.orgSlug)
  switch (mode) {
    case 'live':
    case 'console':
      return `/dashboard/${orgEnvSlug}/actions`
    case 'anon-console':
      return `/develop/${orgEnvSlug}/actions`
  }
}

export function getActionUrl({
  base = process.env.APP_URL,
  orgEnvSlug,
  mode,
  absolute = false,
  slug,
  params,
}: {
  base?: string
  orgEnvSlug: string
  mode: ActionMode | 'anon-console'
  slug: string
  absolute?: boolean
  params?: SerializableRecord
}) {
  const url = new URL(base)

  url.pathname = `${getDashboardPath({ orgEnvSlug, mode })}/${slug}`

  if (params) {
    for (const [key, val] of Object.entries(params)) {
      if (val) {
        url.searchParams.set(key, val.toString())
      }
    }
  }

  return absolute ? url.toString() : `${url.pathname}${url.search}`
}

export function useActionUrlBuilder(mode: ActionMode | 'anon-console') {
  const { orgEnvSlug } = useOrgParams()

  const actionUrlBuilder = useCallback(
    params => {
      return getActionUrl({
        ...params,
        orgEnvSlug,
        mode,
      })
    },
    [orgEnvSlug, mode]
  )

  return actionUrlBuilder
}

export function isBackgroundable(action: {
  backgroundable: boolean | null
  metadata?: { backgroundable?: boolean | null } | null
}): boolean | null {
  return action.metadata?.backgroundable ?? action.backgroundable
}
