import fetch from 'cross-fetch'
import {
  createReactQueryHooks,
  createTRPCClient,
  TRPCClientErrorLike,
} from '@trpc/react'
import { transformer } from './utils'
import type { inferProcedureInput, inferProcedureOutput } from '@trpc/server'
import type { AppRouter } from '../../server/trpc'

export { useQueryClient } from 'react-query'

// import this and use it in place of useQuery()
// e.g. trpc.useQuery, trpc.useMutation, etc
export const trpc = createReactQueryHooks<AppRouter>()

export const clientConfig = {
  url: '/api/trpc',
  transformer,
  fetch,
  headers() {
    return {
      // This is the ID for the current organization, set by DashboardContext
      __interval_organization_id: window.__INTERVAL_ORGANIZATION_ID,
      __interval_organization_environment_id:
        window.__INTERVAL_ORGANIZATION_ENVIRONMENT_ID,
    }
  },
}

// For imperative non-hook queries
export const client = createTRPCClient<AppRouter>(clientConfig)

export type QueryNames = keyof AppRouter['_def']['queries']

export type QueryError = TRPCClientErrorLike<AppRouter>

/**
 * This is a helper method to infer the input of a query resolver
 * @example type GetUsersRequest = inferQueryInput<'user.all'>
 */
export type inferQueryInput<
  TRouteKey extends keyof AppRouter['_def']['queries']
> = inferProcedureInput<AppRouter['_def']['queries'][TRouteKey]>

/**
 * This is a helper method to infer the output of a query resolver
 * @example type GetUsersResponse = inferQueryOutput<'user.all'>
 */
export type inferQueryOutput<
  TRouteKey extends keyof AppRouter['_def']['queries']
> = inferProcedureOutput<AppRouter['_def']['queries'][TRouteKey]>

/**
 * This is a helper method to infer the input of a mutation resolver
 * @example type CreateUserRequest = inferMutationInput<'user.add'>
 */
export type inferMutationInput<
  TRouteKey extends keyof AppRouter['_def']['mutations']
> = inferProcedureInput<AppRouter['_def']['mutations'][TRouteKey]>

/**
 * This is a helper method to infer the output of a mutation resolver
 * @example type CreateUserResponse = inferMutationOutput<'user.add'>
 */
export type inferMutationOutput<
  TRouteKey extends keyof AppRouter['_def']['mutations']
> = inferProcedureOutput<AppRouter['_def']['mutations'][TRouteKey]>
