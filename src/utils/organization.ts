import { useParams } from 'react-router-dom'
import { extractOrgSlug } from './extractOrgSlug'

/**
 * A thin wrapper around useParams that extracts orgSlug + orgEnvSlug if provided, requires that orgSlug exists in URL
 */
export function useOrgParams<T>() {
  const params = useParams<T & { orgSlug: string }>()

  const { orgSlug, envSlug, orgEnvSlug, isDevMode } = extractOrgSlug(params)

  if (!orgSlug)
    throw new Error('useOrgParams: could not find orgSlug in params')

  if (!orgEnvSlug)
    throw new Error('useOrgParams: could not find orgEnvSlug in params')

  const basePath = `/dashboard/${orgEnvSlug}/${
    isDevMode ? 'develop/actions' : 'actions'
  }`

  return {
    ...params,
    orgSlug,
    envSlug,
    orgEnvSlug,
    basePath,
    isDevMode,
  }
}
