import React, { Fragment, useState } from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Routes, Route } from 'react-router-dom'
import DashboardLayout from './components/DashboardLayout'
import NotFoundPage from './pages/not-found'
import { clientConfig, trpc } from './utils/trpc'
import { RecoilRoot } from 'recoil'
import { LoginRedirectHandler } from './components/LoginRedirect'
import { routes, dashboardL1Paths } from './routes'
import useScrollToTop from './utils/useScrollToTop'
import { useCheckCommitRev } from './utils/navigationHooks'

export { routes, dashboardL1Paths }

function CheckCommitRev() {
  useCheckCommitRev()

  return null
}

export default function App() {
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() => trpc.createClient(clientConfig))

  useScrollToTop()

  // separate /dashboard from other routes so they can all go inside a <Route> that wraps
  // them with <DashboardLayout />. maybe there's a better way to apply that layout to those pages?
  const dashboardRoutes: { [key: string]: string }[] = []
  const otherRoutes: { [key: string]: string }[] = []

  routes.forEach(route => {
    if (route.path.startsWith('/dashboard')) {
      dashboardRoutes.push(route)
    } else {
      otherRoutes.push(route)
    }
  })

  // Both react-router-dom BrowserRouter and react-helmet-async HelmetProvider
  // are provided for us in the correct client/server versions by vite-ssr.

  return (
    <RecoilRoot>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {process.env.NODE_ENV === 'production' && <CheckCommitRev />}
          <LoginRedirectHandler>
            <Routes>
              <Route path="/dashboard" element={<DashboardLayout />}>
                {dashboardRoutes.map(
                  ({ path, component: Component = Fragment }) => (
                    <Route key={path} path={path} element={<Component />} />
                  )
                )}
              </Route>
              {otherRoutes.map(({ path, component: Component = Fragment }) => (
                <Route key={path} path={path} element={<Component />} />
              ))}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </LoginRedirectHandler>
        </QueryClientProvider>
      </trpc.Provider>
    </RecoilRoot>
  )
}
