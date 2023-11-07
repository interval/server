import { UserAccessPermission, ConfiguredFeatureFlag } from '@prisma/client'

export interface NavItemDef {
  name: string
  path: string
  requiredPermission?: UserAccessPermission
  requiredPermissions?: UserAccessPermission[]
  requiredFeatureFlag?: ConfiguredFeatureFlag
  children?: NavItemDef[]
  matchPaths?: string[]
  target?: string
}

/**
 * Paths passed to <Link /> cannot have `//` in them, so we have to
 * handle the slug not being loaded yet when generating them.
 */
export function getNavHref(slug: string | undefined, path: string): string {
  return slug ? `/dashboard/${slug}${path}` : `/dashboard${path}`
}

/**
 * Returns the rest of the path after the `/dashboard/:orgSlug` prefix.
 */
function getNavPath(path: string) {
  return path.replace(/^\/dashboard\/[0-9A-Za-z+_-]*/, '')
}

export function isCurrentPage(fullPath: string, item: NavItemDef): boolean {
  const path = getNavPath(fullPath)
  const href = getNavPath(item.path)

  let matches: string[] = []

  // ignore the index route
  if (href !== '') {
    matches.push(href)
  }

  if (item.matchPaths) {
    matches = matches.concat(item.matchPaths)
  }

  const doesMatch = new RegExp(`^(${matches.join('|')})`).test(path)

  return path === href || doesMatch
}
