import { Prisma, User, UserAccessPermission } from '@prisma/client'
import type {
  StartTransactionUser,
  CtxUserRole,
} from '@interval/sdk/dist/internalRpcSchema'
import { getPrimaryRole } from '~/utils/permissions'

export function displayName(
  user: Pick<User, 'firstName' | 'lastName' | 'email'>
): string {
  const names = [user.firstName, user.lastName]
  return names.join(' ') || user.email
}

export type TransactionRunner = Prisma.UserGetPayload<{
  select: {
    id: true
    email: true
    firstName: true
    lastName: true
    userOrganizationAccess: {
      select: {
        permissions: true
        groupMemberships: {
          select: {
            group: {
              select: {
                id: true
                slug: true
              }
            }
          }
        }
      }
    }
  }
}>

export function permissionToCtxUserRole(p: UserAccessPermission): CtxUserRole {
  switch (p) {
    case 'ADMIN':
      return 'admin'
    case 'DEVELOPER':
      return 'developer'
    case 'ACTION_RUNNER':
      return 'member'
    // case 'READONLY_VIEWER':
    //   return 'auditor'
  }

  throw new Error(`Invalid user role permission ${p}`)
}

export function getStartTransactionUser(
  user: TransactionRunner
): StartTransactionUser {
  const orgAccess = user.userOrganizationAccess[0]

  if (!orgAccess) {
    throw new Error('No UserOrganizationAccess found')
  }

  const rolePermission = getPrimaryRole(orgAccess.permissions)

  if (!rolePermission) {
    throw new Error('No user role permission found')
  }

  const role = permissionToCtxUserRole(rolePermission)

  return {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role,
    teams: orgAccess.groupMemberships.map(gm => gm.group.slug),
  }
}
