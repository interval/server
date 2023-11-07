import glob from 'glob'
import { getDashboardL1Paths } from '~/utils/routes'

// Should keep these in sync with those in `src/App.tsx`; they must be literals there.
export const ROUTES_GLOB = 'src/pages/**/[a-z[]*.{tsx,mdx}'
export const DASHBOARD_ROUTES_GLOB =
  'src/pages/dashboard/\\[orgSlug\\]/*/**/[a-z]*.{tsx,mdx}'

const DASHBOARD_ROUTES = glob.sync(DASHBOARD_ROUTES_GLOB)
export const dashboardL1Paths = getDashboardL1Paths(DASHBOARD_ROUTES)
