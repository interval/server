import { useLocation } from 'react-router-dom'
import { getBackPath } from './url'

export default function useBackPath() {
  const location = useLocation()
  if (
    location.state &&
    typeof location.state === 'object' &&
    'backPath' in location.state &&
    typeof location.state['backPath'] === 'string'
  ) {
    return location.state['backPath']
  }

  return getBackPath(location.pathname)
}
