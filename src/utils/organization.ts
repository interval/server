import { useParams } from 'react-router-dom'

export function extractOrgSlug({ orgSlug: slug }: { orgSlug?: string }): {
  orgSlug?: string
  envSlug?: string
  orgEnvSlug?: string
  isDevMode?: boolean
} {
  if (!slug) return {}

  const orgEnvSlug = slug

  const isDevMode = location.pathname.startsWith(
    `/dashboard/${orgEnvSlug}/develop/actions`
  )

  if (slug.includes('+')) {
    const [orgSlug, envSlug] = slug.split('+')

    return {
      orgSlug,
      envSlug,
      isDevMode,
      orgEnvSlug,
    }
  }

  return {
    orgSlug: slug,
    orgEnvSlug,
    isDevMode,
  }
}

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
