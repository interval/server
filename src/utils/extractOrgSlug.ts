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
