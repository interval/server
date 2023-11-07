function cleanPath(path: string): string {
  return path
    .replace(/src|.?\/pages|index|\.(tsx|mdx)$/g, '')
    .replace(/\[\.{3}.+\]/, '*')
    .replace(/\[([A-Za-z_]+)\]/g, ':$1')
}

export function getDashboardL1Paths(paths: string[]): Set<string> {
  return new Set(
    paths
      .map(route => {
        const path = cleanPath(route)
          .replace('/dashboard/:orgSlug/', '')
          .split('/')[0]

        return path
      })
      .filter(Boolean)
  )
}

export function getDashboardL0Paths(paths: string[]): Set<string> {
  return new Set(
    paths
      .filter(path => !path.includes('[orgSlug]'))
      .map(route => {
        const path = cleanPath(route).replace('/dashboard/', '').split('/')[0]

        return path
      })
      .filter(Boolean)
  )
}
