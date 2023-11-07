import { Navigate, useLocation } from 'react-router-dom'
import { atom, useSetRecoilState } from 'recoil'
import { useEffect } from 'react'
import { localStorageRecoilEffect } from '~/utils/localStorage'

// Stores `redirectAfterLogin` to atom state + syncs with local storage.
// This makes redirects persist through page refreshes, e.g. Google login.
export const redirectAfterLogin = atom<string | null>({
  key: 'redirectAfterLogin',
  default: null,
  effects: [localStorageRecoilEffect('iv_redirectAfterLogin')],
})

// Reads `loginRedirect` from the location state and adds it to recoil + localStorage
function useLoginRedirect() {
  const location = useLocation()
  const { loginRedirect: stateRedirect } =
    (location.state as Record<string, string | undefined | null>) || {}
  const setRecoilRedirect = useSetRecoilState(redirectAfterLogin)

  // updates recoil + localStorage if a redirect is found in the location state on any page
  useEffect(() => {
    if (stateRedirect !== undefined) {
      setRecoilRedirect(stateRedirect)
    }
  }, [stateRedirect, setRecoilRedirect])
}

// Wrapper around <Navigate /> that ensures we clear the redirect as we use it
export function PerformLoginRedirect({ to }) {
  const setRedirect = useSetRecoilState(redirectAfterLogin)

  useEffect(() => {
    if (to.startsWith('http')) {
      setRedirect(null)
      window.location.assign(to)
    }
  }, [to, setRedirect])

  if (to.startsWith('http')) {
    return null
  }

  return <Navigate to={to} state={{ loginRedirect: null }} replace />
}

export function LoginRedirectHandler(props) {
  useLoginRedirect()
  return <>{props.children}</>
}
