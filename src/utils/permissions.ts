/**
 * Database-level UserAccessPermissions are the base-level permissions that
 * are actually written to UserOrganizationAccess.
 *
 * Any "higher-level" role-like permissions which are made of a composition of
 * base UserAccessPermissions can be defined in UserAccessPermission, which must be
 * reduced to their base levels before being written to the database.
 *
 * This will allow us to to extract more finely-grained permissions from
 * existing permissions in a backward-compatible way, and allow us to provide
 * role-like shorthands for common groups of permissions.
 */

import { UserOrganizationAccess, UserAccessPermission } from '@prisma/client'

type RolePermissionMap = {
  [key in UserAccessPermission]: UserAccessPermission[] | UserAccessPermission
}

/**
 * Any role-like permissions that imply others should be defined here.
 */
const ROLE_PERMISSIONS: RolePermissionMap = {
  ...UserAccessPermission,
  ADMIN: [
    'RUN_DEV_ACTIONS',
    'RUN_PROD_ACTIONS',
    'READ_DEV_ACTIONS',
    'READ_PROD_ACTIONS',
    'WRITE_PROD_ACTIONS',
    'DEQUEUE_PROD_ACTIONS',
    'READ_DEV_TRANSACTIONS',
    'READ_PROD_TRANSACTIONS',
    'READ_ORG_PROD_TRANSACTIONS',
    'READ_USERS',
    'WRITE_USERS',
    'CREATE_DEV_API_KEYS',
    'CREATE_PROD_API_KEYS',
    'READ_ORG_USER_API_KEY_EXISTENCE',
    'DELETE_ORG_USER_API_KEYS',
    'WRITE_ORG_SETTINGS',
    'WRITE_ORG_OAUTH',
    'ACCESS_ORG_ENVIRONMENTS',
  ],
  DEVELOPER: [
    'READ_PROD_ACTIONS',
    'RUN_PROD_ACTIONS',
    'READ_PROD_TRANSACTIONS',
    'READ_DEV_ACTIONS',
    'RUN_DEV_ACTIONS',
    'READ_DEV_TRANSACTIONS',
    'CREATE_DEV_API_KEYS',
    'ACCESS_ORG_ENVIRONMENTS',
  ],
  ACTION_RUNNER: [
    'READ_PROD_ACTIONS',
    'RUN_PROD_ACTIONS',
    'READ_PROD_TRANSACTIONS',
    'ACCESS_ORG_ENVIRONMENTS',
  ],
  READONLY_VIEWER: [
    'READ_DEV_ACTIONS',
    'READ_PROD_ACTIONS',
    'READ_DEV_TRANSACTIONS',
    'READ_PROD_TRANSACTIONS',
    'READ_USERS',
    'READ_ORG_USER_API_KEY_EXISTENCE',
    'ACCESS_ORG_ENVIRONMENTS',
  ],
}

/**
 * These permissions/roles are available in the user interface to assign to users.
 */
export const EXPOSED_ROLES: UserAccessPermission[] = [
  'ADMIN',
  'DEVELOPER',
  'ACTION_RUNNER',
]

export const SDK_PERMISSIONS_MIN_VERSION = '0.34.0'

export function reducePermission(
  permission: UserAccessPermission
): UserAccessPermission[] | UserAccessPermission {
  return ROLE_PERMISSIONS[permission]
}

export function getPrimaryRole(
  permissions: UserAccessPermission[]
): UserAccessPermission | undefined {
  const primaryPermission = EXPOSED_ROLES.find(role =>
    permissions.includes(role)
  )
  return primaryPermission
}

export function reducePermissions(
  permissions: UserAccessPermission[]
): Set<UserAccessPermission> {
  const perms = permissions.flatMap(p => {
    const reduced = reducePermission(p)
    if (Array.isArray(reduced)) {
      return Array.from(reducePermissions(reduced).values())
    }

    return reduced
  })

  return new Set(perms) as Set<UserAccessPermission>
}

function containsPermission(
  permissions: UserAccessPermission[],
  permission: UserAccessPermission
) {
  const reduced = reducePermissions(permissions)
  return reduced.has(permission)
}

export function hasPermission(
  access: Pick<UserOrganizationAccess, 'permissions'> | undefined,
  permission: UserAccessPermission
): boolean {
  if (!access) return false

  return containsPermission(access.permissions, permission)
}
