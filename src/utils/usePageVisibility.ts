import { useEffect, useState } from 'react'

export default function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState !== 'hidden')
    }

    const handleFocusChange = event => {
      setIsVisible(event.type === 'focus')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    window.addEventListener('blur', handleFocusChange)
    window.addEventListener('focus', handleFocusChange)

    return () => {
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
        false
      )

      window.removeEventListener('blur', handleFocusChange)
      window.removeEventListener('focus', handleFocusChange)
    }
  }, [])

  return isVisible
}
