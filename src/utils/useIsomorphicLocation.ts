import {
  useLocation as useReactRouterLocation,
  Link as ReactRouterLink,
} from 'react-router-dom'

// Will refactor away this file in a future PR

export function useIsomorphicLink() {
  return ReactRouterLink
}

export default function useIsomorphicLocation() {
  return useReactRouterLocation
}
