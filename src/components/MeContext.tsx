import { createContext, useContext } from 'react'
import { DateTime } from 'luxon'
import { trpc, inferQueryOutput } from 'src/utils/trpc'

export interface MeContextData {
  me: inferQueryOutput<'user.me'>
  isLoading: boolean
  isRefetching: boolean
  isFetching: boolean
  refetch: () => void
}

export const MeContext = createContext<MeContextData>({
  me: null,
  isLoading: false,
  isRefetching: false,
  isFetching: false,
  refetch: () => {
    //
  },
})

export function MeProvider({ children }: { children: React.ReactNode }) {
  const usersMe = trpc.useQuery([
    'user.me',
    {
      timeZoneName: DateTime.now().zoneName,
    },
  ])

  const value = {
    me: usersMe?.data ?? null,
    isLoading: usersMe.isLoading,
    isRefetching: usersMe.isRefetching,
    isFetching: usersMe.isFetching,
    refetch: usersMe.refetch,
  }

  return <MeContext.Provider value={value}>{children}</MeContext.Provider>
}

export function useMe(): MeContextData {
  return useContext(MeContext)
}
