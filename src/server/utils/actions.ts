import prisma from '~/server/prisma'
import {
  AccessControlDefinition,
  ActionDefinition,
  PageDefinition,
} from '@interval/sdk/dist/internalRpcSchema'
import {
  Action,
  ActionGroup,
  ActionAccessLevel,
  ActionMetadata,
  HostInstance,
  HttpHost,
  Prisma,
  ActionAvailability,
  ActionGroupMetadata,
} from '@prisma/client'
import {
  ActionSearchResult,
  ActionMode,
  ActionGroupLookupResult,
  ActionLookupResult,
} from '~/utils/types'
import { isGroupSlugValid, isSlugValid } from '../../utils/validate'
import {
  getFullActionSlug,
  getGroupSlug,
  getStatus,
  groupSorter,
  sortByName,
  hostSorter,
  getActionAccessLevel,
  getActionGroupAccessLevel,
} from '~/utils/actions'
import { isFlagEnabled } from './featureFlags'
import { SDK_PERMISSIONS_MIN_VERSION } from '~/utils/permissions'
import { NODE_SDK_NAME } from '~/utils/isomorphicConsts'
import { logger } from '~/server/utils/logger'

export function reconstructActionGroups<
  G extends Omit<
    ActionGroupLookupResult,
    'status' | 'canRun' | 'canView' | 'canConfigure' | 'actions' | 'groups'
  >,
  A extends Omit<
    ActionLookupResult,
    'status' | 'canRun' | 'canView' | 'canConfigure'
  >
>({
  slugPrefix,
  actionGroups,
  actions,
  canConfigureActions,
  mode,
}: {
  slugPrefix?: string
  actionGroups: G[]
  actions: A[]
  canConfigureActions: boolean
  mode: ActionMode
}): {
  actions: ActionLookupResult[]
  allActions: ActionSearchResult[]
  archivedActions: ActionLookupResult[]
  groups: ActionGroupLookupResult[]
  allGroups: ActionGroupLookupResult[]
  groupBreadcrumbs: G[]
} {
  const actionsResponse: ActionLookupResult[] = []
  const allActions: ActionSearchResult[] = []
  const archivedActions: ActionLookupResult[] = []

  const groupsMap = addPermissionsToGroups({
    groups: actionGroups,
  })

  for (const group of groupsMap.values()) {
    const groupSlug = getGroupSlug(group.slug)
    if (!groupSlug) continue

    const parentGroup = groupsMap.get(groupSlug)
    if (parentGroup) {
      if (
        !group.unlisted &&
        (group.status === 'ONLINE' ||
          (mode === 'live' && group.status && group.status !== 'OFFLINE'))
      ) {
        parentGroup.groups.push(group)
      }
      group.parentSlug = parentGroup.slug
    }
  }

  for (const action of actions) {
    if (action.isInline) continue

    action.hostInstances.sort(hostSorter)
    action.httpHosts.sort(hostSorter)
    const status = getStatus(action)

    const canConfigure = canConfigureActions

    const { canRun, canView } = getActionAccessLevel({
      action,
      groupsMap,
    })

    // skip if access is explicitly blocked
    if (canRun === false && canView === false) {
      continue
    }

    const isArchived = !!action.metadata?.archivedAt

    const groupSlug = getGroupSlug(action.slug)

    allActions.push({
      id: action.id,
      slug: action.slug,
      name: action.name,
      status,
      description: action.description,
      unlisted: action.unlisted,
      isArchived,
      canView,
      canRun,
      canConfigure,
      parentSlug: groupSlug,
    })

    if (!status || status === 'OFFLINE') {
      continue
    }

    if (mode === 'console' && status === 'UNREACHABLE') {
      continue
    }

    if (action.unlisted) {
      continue
    }

    const actionWithPermissions = {
      ...action,
      status,
      canRun,
      canView,
      canConfigure,
    }

    if (isArchived) {
      archivedActions.push(actionWithPermissions)
      continue
    }

    if (groupSlug) {
      if (slugPrefix && groupSlug === slugPrefix) {
        actionsResponse.push(actionWithPermissions)
      } else {
        const group = groupsMap.get(groupSlug)
        if (group) {
          group.actions.push(actionWithPermissions)
          actionWithPermissions.parentSlug = group.slug
        }
      }
    } else {
      actionsResponse.push(actionWithPermissions)
    }
  }

  const groupBreadcrumbs = slugPrefix
    ? actionGroups.filter(
        group =>
          slugPrefix === group.slug || slugPrefix.startsWith(`${group.slug}/`)
      )
    : []
  groupBreadcrumbs.sort(groupSorter)

  const allGroups = Array.from(groupsMap.values()).filter(group => {
    const status = getStatus(group)

    // excludes groups marked as UNREACHABLE in dev mode
    if (mode === 'console') {
      return status && status === 'ONLINE'
    }

    if (!canAccessEntityInTree(groupsMap, group.slug)) {
      return false
    }

    // includes groups marked as UNREACHABLE in live mode
    return status && status !== 'OFFLINE'
  })

  const groups = allGroups.filter(group => {
    const groupSlug = getGroupSlug(group.slug)

    if (group.unlisted) return false

    if (group.slug === slugPrefix) return false

    if (!group.canRun && !group.canView && group.actions.length === 0) {
      return false
    }

    return groupSlug === slugPrefix || (!groupSlug && !slugPrefix)
  })
  groups.sort(groupSorter)
  sortByName(actionsResponse)
  sortByName(allActions)

  return {
    actions: actionsResponse,
    allActions,
    archivedActions,
    groups,
    allGroups,
    groupBreadcrumbs,
  }
}

export async function setActionPermissions({
  actionMetadata,
  teamPermissions,
}: {
  actionMetadata: ActionMetadata
  teamPermissions?: {
    groupId: string
    level: ActionAccessLevel | 'NONE'
  }[]
}) {
  // remove existing granular permissions and reconstruct permissions below
  await prisma.actionAccess.deleteMany({
    where: {
      actionMetadataId: actionMetadata.id,
    },
  })

  if (actionMetadata.availability === 'GROUPS') {
    for (const access of teamPermissions ?? []) {
      if (access.level === 'NONE') continue

      try {
        await prisma.actionAccess.create({
          data: {
            level: access.level,
            actionMetadata: { connect: { id: actionMetadata.id } },
            userAccessGroup: { connect: { id: access.groupId } },
          },
        })
      } catch (error) {
        logger.error('Failed adding actionAccess', {
          actionMetadataId: actionMetadata.id,
          access,
          error,
        })
      }
    }
  }
}

export async function setActionGroupPermissions({
  actionGroupMetadata,
  teamPermissions,
}: {
  actionGroupMetadata: ActionGroupMetadata
  teamPermissions?: {
    groupId: string
    level: ActionAccessLevel | 'NONE'
  }[]
}) {
  // remove existing granular permissions and reconstruct permissions below
  await prisma.actionGroupAccess.deleteMany({
    where: {
      actionGroupMetadataId: actionGroupMetadata.id,
    },
  })

  if (actionGroupMetadata.availability === 'GROUPS') {
    for (const access of teamPermissions ?? []) {
      if (access.level === 'NONE') continue

      try {
        await prisma.actionGroupAccess.create({
          data: {
            level: access.level,
            actionGroupMetadata: { connect: { id: actionGroupMetadata.id } },
            userAccessGroup: { connect: { id: access.groupId } },
          },
        })
      } catch (error) {
        logger.error('Failed adding actionGroupAccess', {
          actionGroupMetadataId: actionGroupMetadata.id,
          access,
          error,
        })
      }
    }
  }
}

function getTeamsFromDefinition(
  def: ActionDefinition | PageDefinition
): string[] {
  const slugs: string[] = []

  if (!def.access || typeof def.access === 'string') return []

  if (!def.access.teams) return []

  slugs.push(...def.access.teams)

  return slugs
}

export async function getPermissionsWarning({
  groups,
  actions,
  organizationId,
}: {
  actions: ActionDefinition[]
  groups?: PageDefinition[]
  organizationId: string
}): Promise<string | null> {
  const slugs: string[] = []

  const validSlugs = (
    await prisma.userAccessGroup.findMany({
      where: { organizationId },
    })
  ).map(group => group.slug)

  for (const group of groups ?? []) {
    const slugsInDef = getTeamsFromDefinition(group)

    for (const slug of slugsInDef) {
      if (!validSlugs.includes(slug)) {
        slugs.push(` - Page: ${group.slug} - team '${slug}' does not exist`)
      }
    }
  }
  for (const action of actions ?? []) {
    const slugsInDef = getTeamsFromDefinition(action)

    for (const slug of slugsInDef) {
      if (!validSlugs.includes(slug)) {
        slugs.push(` - Action: ${action.slug} - team '${slug}' does not exist`)
      }
    }
  }

  if (slugs.length > 0) {
    return [
      `One or more invalid team slugs were found in your config:`,
      slugs.join('\n'),
      `Use teams' slugs when granting access to actions and pages.\nLearn more: https://interval.com/docs/writing-actions/authentication#defining-permissions-in-code\n`,
    ].join('\n\n')
  }

  return null
}

export async function initializeActions({
  hostInstance,
  httpHost,
  actions,
  groups,
  developerId,
  organizationEnvironmentId,
  sdkName,
  sdkVersion,
}: {
  hostInstance: HostInstance | null
  httpHost: HttpHost | null
  actions: ActionDefinition[]
  groups?: PageDefinition[]
  developerId: string | null
  organizationEnvironmentId: string
  sdkName: string
  sdkVersion: string
}): Promise<{
  initializedActions: Action[]
  initializedActionGroups: ActionGroup[]
}> {
  if (!hostInstance && !httpHost) {
    throw new Error('Must specify either HostInstance or HttpHost')
  }

  const organizationId = (hostInstance?.organizationId ??
    httpHost?.organizationId) as string

  const initializedActions: Action[] = []
  const initializedActionGroups: ActionGroup[] = []

  const isUsingPermissionsCapableSDK =
    sdkName === NODE_SDK_NAME && sdkVersion >= SDK_PERMISSIONS_MIN_VERSION

  if (groups) {
    for (const {
      slug,
      name,
      description,
      unlisted = false,
      hasHandler,
      hasIndex,
      access,
    } of groups) {
      if (!isGroupSlugValid(slug)) {
        continue
      }

      let group = await prisma.actionGroup.findFirst({
        where: {
          organizationId,
          organizationEnvironmentId,
          developerId,
          slug,
        },
      })

      const { availability, teamPermissions } = await permissionsCodeToConfig({
        access,
        organizationId,
      })

      if (group) {
        group = await prisma.actionGroup.update({
          where: {
            id: group.id,
          },
          data: {
            name,
            description,
            unlisted,
            hasHandler: hasHandler ?? hasIndex ?? false,
            hostInstances: hostInstance
              ? {
                  connect: { id: hostInstance.id },
                }
              : undefined,
            httpHosts: httpHost
              ? {
                  connect: { id: httpHost.id },
                }
              : undefined,
          },
        })
      } else {
        group = await prisma.actionGroup.create({
          data: {
            slug,
            organizationId,
            developerId,
            organizationEnvironmentId,
            name,
            description,
            unlisted,
            hasHandler: hasHandler ?? hasIndex ?? false,
            hostInstances: hostInstance
              ? {
                  connect: { id: hostInstance.id },
                }
              : undefined,
            httpHosts: httpHost
              ? {
                  connect: { id: httpHost.id },
                }
              : undefined,
          },
        })
      }

      initializedActionGroups.push(group)

      if (isUsingPermissionsCapableSDK && developerId === null) {
        const actionGroupMetadata = await prisma.actionGroupMetadata.upsert({
          where: { actionGroupId: group.id },
          create: {
            actionGroupId: group.id,
            availability: availability ?? null,
          },
          update: {
            availability: availability ?? null,
          },
        })
        await setActionGroupPermissions({
          actionGroupMetadata,
          teamPermissions,
        })
      }
    }
  }

  for (const {
    groupSlug,
    slug,
    name,
    description,
    backgroundable = false,
    unlisted = false,
    warnOnClose = true,
    access,
  } of actions) {
    if (!isGroupSlugValid(groupSlug) || !isSlugValid(slug)) {
      continue
    }

    const fullSlug = getFullActionSlug({ groupSlug, slug })

    // Need to do this upsert manually because unique constraints
    // are unenforced for rows with null `developerId`
    let action = await prisma.action.findFirst({
      where: {
        organizationId,
        developerId,
        organizationEnvironmentId,
        slug: fullSlug,
      },
      include: {
        metadata: true,
      },
    })

    const { availability, teamPermissions } = await permissionsCodeToConfig({
      access,
      organizationId,
    })

    if (action) {
      action = await prisma.action.update({
        where: {
          id: action.id,
        },
        data: {
          name,
          description,
          backgroundable,
          warnOnClose,
          unlisted,
          hostInstances: hostInstance
            ? {
                connect: { id: hostInstance.id },
              }
            : undefined,
          httpHosts: httpHost
            ? {
                connect: { id: httpHost.id },
              }
            : undefined,
        },
        include: {
          metadata: true,
        },
      })
    } else {
      action = await prisma.action.create({
        data: {
          slug: fullSlug,
          name,
          description,
          backgroundable,
          warnOnClose,
          unlisted,
          organizationId,
          hostInstances: hostInstance
            ? {
                connect: { id: hostInstance.id },
              }
            : undefined,
          httpHosts: httpHost
            ? {
                connect: { id: httpHost.id },
              }
            : undefined,
          developerId,
          organizationEnvironmentId,
        },
        include: {
          metadata: true,
        },
      })
    }

    initializedActions.push(action)

    if (isUsingPermissionsCapableSDK && developerId === null) {
      const actionMetadata = await prisma.actionMetadata.upsert({
        where: { actionId: action.id },
        create: {
          actionId: action.id,
          availability: availability ?? null,
        },
        update: {
          availability: availability ?? null,
        },
      })

      await setActionPermissions({
        actionMetadata,
        teamPermissions,
      })
    }
  }

  return { initializedActions, initializedActionGroups }
}

export const getActionGroups = (userId?: string) =>
  Prisma.validator<Prisma.ActionGroupArgs>()({
    include: {
      hostInstances: {
        where: { status: { not: 'OFFLINE' } },
        select: { status: true, isInitializing: true },
        orderBy: { createdAt: 'desc' },
      },
      httpHosts: {
        where: { status: { not: 'OFFLINE' } },
        select: { status: true },
        orderBy: { createdAt: 'desc' },
      },
      metadata: {
        include: {
          accesses: userId
            ? actionMetadataWithAccesses(userId).include.metadata.include
                .accesses
            : true,
        },
      },
    },
  })

export const getLiveModeActions = (userId?: string) =>
  Prisma.validator<Prisma.ActionArgs>()({
    include: {
      hostInstances: {
        where: { status: { not: 'OFFLINE' } },
        select: { status: true },
        orderBy: { createdAt: 'desc' },
      },
      httpHosts: {
        where: { status: { not: 'OFFLINE' } },
        select: { status: true },
        orderBy: { createdAt: 'desc' },
      },
      schedules: {
        where: { deletedAt: null },
      },
      metadata: {
        include: {
          accesses: userId
            ? actionMetadataWithAccesses(userId).include.metadata.include
                .accesses
            : true,
        },
      },
    },
  })

export const actionMetadataWithAccesses = (userId: string) =>
  Prisma.validator<Prisma.ActionArgs>()({
    include: {
      metadata: {
        include: {
          accesses: {
            where: {
              userAccessGroup: {
                memberships: {
                  some: {
                    userOrganizationAccess: {
                      userId,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

export async function getAllActions({
  organizationId,
  developerId,
  organizationEnvironmentId,
  userId,
}: {
  organizationId: string
  developerId: string | null
  organizationEnvironmentId: string
  userId?: string
}): Promise<Prisma.ActionGetPayload<ReturnType<typeof getLiveModeActions>>[]> {
  return prisma.action.findMany({
    where: {
      organizationId,
      developerId,
      organizationEnvironmentId,
    },
    include: getLiveModeActions(userId).include,
    orderBy: {
      slug: 'asc',
    },
  })
}

export async function getAllActionGroups({
  organizationId,
  developerId,
  organizationEnvironmentId,
  userId,
}: {
  organizationId: string
  developerId: string | null
  organizationEnvironmentId: string
  userId?: string
}): Promise<
  Map<string, Prisma.ActionGroupGetPayload<ReturnType<typeof getActionGroups>>>
> {
  const groups = await prisma.actionGroup.findMany({
    where: {
      organizationId,
      developerId,
      organizationEnvironmentId,
    },
    include: getActionGroups(userId).include,
    orderBy: {
      slug: 'asc',
    },
  })

  const groupsMap = new Map<
    string,
    Prisma.ActionGroupGetPayload<ReturnType<typeof getActionGroups>>
  >(groups.map(group => [group.slug, group]))

  return groupsMap
}

type GroupPermissionDefinition = { groupId: string; level: ActionAccessLevel }

/**
 * Converts code-based permissions into values for writing to the database.
 */
async function permissionsCodeToConfig({
  access,
  organizationId,
}: {
  access?: AccessControlDefinition | null
  organizationId: string
}): Promise<{
  availability: ActionAvailability | undefined
  teamPermissions: GroupPermissionDefinition[] | undefined
  warnings: string[]
}> {
  const warnings: string[] = []

  if (!access) {
    return { availability: undefined, teamPermissions: undefined, warnings }
  }

  let availability: ActionAvailability
  let teamPermissions: GroupPermissionDefinition[] = []

  if (access === 'entire-organization') {
    availability = 'ORGANIZATION'
  } else {
    availability = 'GROUPS'

    if ('teams' in access && access.teams) {
      const groups = await prisma.userAccessGroup.findMany({
        where: {
          organizationId,
          slug: {
            in: access.teams,
          },
        },
      })

      const validSlugs = groups.map(group => group.slug)

      const invalidSlugs = access.teams.filter(
        slug => !validSlugs.includes(slug)
      )

      for (const slug in invalidSlugs) {
        warnings.push('Invalid team slug: ' + slug)
      }

      // RUNNER only supported via code config
      teamPermissions = groups.map(group => ({
        groupId: group.id,
        level: 'RUNNER',
      }))
    }
  }

  return {
    availability,
    teamPermissions,
    warnings,
  }
}

/**
 * Creates a map of ActionGroups that includes inherited permissions.
 */
export function addPermissionsToGroups<
  T extends Omit<
    ActionGroupLookupResult,
    'status' | 'canRun' | 'canView' | 'canConfigure' | 'actions' | 'groups'
  >
>({ groups }: { groups: T[] }): Map<string, ActionGroupLookupResult> {
  const groupsMap = new Map<string, T>(groups.map(group => [group.slug, group]))

  const groupsWithPermissions = new Map<string, ActionGroupLookupResult>(
    Array.from(groupsMap.values()).map(group => {
      const { canRun, canView } = getActionGroupAccessLevel({
        group,
        groupsMap,
      })

      return [
        group.slug,
        {
          ...group,
          status: getStatus(group),
          canRun,
          canView,
          actions: [],
          groups: [],
        },
      ]
    })
  )

  return groupsWithPermissions
}

/**
 * Determines whether the user can access a group, actions in that group,
 * or any groups & their actions nested within the `groupSlug`.
 */
function canAccessEntityInTree(
  groupsMap: Map<string, ActionGroupLookupResult>,
  groupSlug: string
) {
  const group = groupsMap.get(groupSlug)

  if (group && group.canRun) return true

  if (group && group.actions.length > 0) return true

  const nestedGroups = Array.from(groupsMap.keys()).filter(slug =>
    slug.startsWith(`${groupSlug}/`)
  )

  for (const nestedSlug of nestedGroups) {
    const canAccessChildren = canAccessEntityInTree(groupsMap, nestedSlug)

    if (canAccessChildren) return true
  }

  return false
}
