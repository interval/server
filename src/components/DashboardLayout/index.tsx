import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { MeProvider } from '~/components/MeContext'
import { DashboardProvider } from '../DashboardContext'
import IVSpinner from '~/components/IVSpinner'
import { WebSocketClientProvider } from '../TransactionUI/useWebSocketClient'

// This contains a base Suspense wrapper as a fallback, but should
// likely add one closer to any lazy components if used.

export default function DashboardLayout() {
  return (
    <MeProvider>
      <DashboardProvider>
        <WebSocketClientProvider>
          <Suspense fallback={<IVSpinner fullPage delayDuration={100} />}>
            <Outlet />
          </Suspense>
        </WebSocketClientProvider>
      </DashboardProvider>
    </MeProvider>
  )
}
