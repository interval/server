import { Navigate } from 'react-router-dom'
import { useOrgParams } from '~/utils/organization'

export default function ConsoleRedirect() {
  const { orgEnvSlug } = useOrgParams()
  return <Navigate to={`/dashboard/${orgEnvSlug}/history`} replace />
}
