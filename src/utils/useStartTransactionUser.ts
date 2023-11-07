import { useMemo } from 'react'
import { getStartTransactionUser, TransactionRunner } from './user'
import type { StartTransactionUser } from '@interval/sdk/dist/internalRpcSchema'

export default function useStartTransactionUser(
  user: TransactionRunner | undefined | null
): StartTransactionUser | null {
  const startTransactionUser = useMemo(() => {
    if (!user?.id) {
      console.error('Current user is unknown')
      return null
    }

    try {
      return getStartTransactionUser({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userOrganizationAccess: user.userOrganizationAccess,
      })
    } catch (err) {
      console.error('Failed determining transaction user', err)
      return null
    }
  }, [
    user?.id,
    user?.email,
    user?.firstName,
    user?.lastName,
    user?.userOrganizationAccess,
  ])

  const stringifiedTeams = JSON.stringify(startTransactionUser?.teams ?? [])

  const memoizedTeams = useMemo(
    () => startTransactionUser?.teams ?? [],
    // We don't want to rerender this when userOrganizationAccess array is a different object,
    // only if the contents are different
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stringifiedTeams]
  )

  return useMemo(() => {
    if (!startTransactionUser?.email) return null

    return {
      email: startTransactionUser.email,
      firstName: startTransactionUser.firstName,
      lastName: startTransactionUser.lastName,
      role: startTransactionUser.role,
      teams: memoizedTeams,
    }
  }, [
    startTransactionUser?.email,
    startTransactionUser?.firstName,
    startTransactionUser?.lastName,
    startTransactionUser?.role,
    memoizedTeams,
  ])
}
