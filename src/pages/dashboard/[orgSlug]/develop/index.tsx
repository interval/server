import { Navigate } from 'react-router-dom'
import { useHasPermission } from '~/components/DashboardContext'
import { atom } from 'recoil'
import IVSpinner from '~/components/IVSpinner'

export const hasRecentlyConnectedToConsole = atom({
  key: 'hasRecentlyConnectedToConsole',
  default: false,
})

export default function DevelopIndexPage() {
  const canDevelop = useHasPermission('RUN_DEV_ACTIONS')
  const canCreateKeys = useHasPermission('CREATE_PROD_API_KEYS')

  if (canDevelop === undefined || canCreateKeys === undefined) {
    return <IVSpinner fullPage delayDuration={100} />
  }

  return (
    <Navigate
      to={canDevelop ? 'actions' : canCreateKeys ? 'keys' : '/dashboard'}
    />
  )
}
