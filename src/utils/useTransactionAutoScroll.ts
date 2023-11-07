import { useEffect } from 'react'

export default function useTransactionAutoScroll({
  enabled,
  ref,
}: {
  enabled: boolean
  ref: React.RefObject<HTMLFormElement | HTMLDivElement>
}) {
  useEffect(() => {
    if (!enabled) return

    const focusedEl = document.activeElement

    if (focusedEl && focusedEl instanceof HTMLElement) {
      // don't blur if the focused element is inside a dialog (e.g. io.confirm)
      // this will not interfere with scroll behavior
      if (focusedEl.closest('[role="dialog"]')) return

      focusedEl.blur()
    }

    const timeoutHandle = setTimeout(() => {
      ref.current?.scrollIntoView({
        behavior: 'smooth',
      })
    }, 100)

    return () => {
      clearTimeout(timeoutHandle)
    }
  }, [enabled, ref])
}
