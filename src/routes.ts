import { getDashboardL1Paths } from './utils/routes'

// Should keep these in sync with those in `src/utils/routes.ts`; they must be literals here.

// @ts-ignore - this syntax requires "module" to be "esnext" but it still works fine without,
// and exports (e.g. in envoy.config.ts) don't work with "module" set to "esnext".
let ROUTES: Record<string, { [key: string]: any }>
try {
  ROUTES = import.meta.globEager('./pages/**/[a-z[]*.{tsx,mdx}')
} catch {
  ROUTES = {}
}

// @ts-ignore - this syntax requires "module" to be "esnext" but it still works fine without,
// and exports (e.g. in envoy.config.ts) don't work with "module" set to "esnext".
let DASHBOARD_ROUTES: Record<string, { [key: string]: any }>

try {
  DASHBOARD_ROUTES = import.meta.globEager(
    './pages/dashboard/**/[a-z]*.{tsx,mdx}'
  )
} catch {
  DASHBOARD_ROUTES = {}
}

export const routes = Object.keys(ROUTES).map(route => {
  const path = route
    .replace(/.\/pages|index|\.(tsx|mdx)$/g, '')
    .replace(/\[\.{3}.+\]/, '*')
    .replace(/\[([A-Za-z_]+)\]/g, ':$1')

  return { path, component: ROUTES[route].default }
})

export const dashboardL1Paths = getDashboardL1Paths(
  Object.keys(DASHBOARD_ROUTES)
)
