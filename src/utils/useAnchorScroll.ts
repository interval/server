import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function useAnchorScroll() {
  const location = useLocation()

  useLayoutEffect(() => {
    const element = document.getElementById(location.hash.replace('#', ''))

    if (!element) return

    window.scrollTo({ top: element.offsetTop })
  }, [location])
}
