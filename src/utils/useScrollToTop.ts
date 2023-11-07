import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import usePrevious from './usePrevious'

/**
 * Scroll to top when navigating to a new page.
 * (this is not the default behavior in React Router v5.)
 */
export default function useScrollToTop() {
  const { pathname, hash } = useLocation()
  const prevPathname = usePrevious(pathname)

  useLayoutEffect(() => {
    if (prevPathname !== pathname) {
      if (hash) {
        const element = document.querySelector(hash)
        if (element) {
          element.scrollIntoView()
        }
      } else {
        window.scrollTo(0, 0)
      }
    }
  }, [pathname, prevPathname, hash])
}
