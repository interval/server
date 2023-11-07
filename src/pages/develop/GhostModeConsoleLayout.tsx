import { ReactNode, useEffect } from 'react'
import {
  OrganizationProvider,
  useOrganization,
} from '~/components/DashboardContext'

function OrgIdSetter() {
  const org = useOrganization()

  const orgId = org.id
  useEffect(() => {
    if (orgId) {
      window.__INTERVAL_ORGANIZATION_ID = orgId
    }

    return () => {
      window.__INTERVAL_ORGANIZATION_ID = undefined
    }
  }, [orgId])

  return null
}

export default function GhostModeConsoleLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <OrganizationProvider>
      <>
        {children}
        <OrgIdSetter />
      </>
    </OrganizationProvider>
  )
}
