import { useEffect } from 'react'

export default function useTransactionAutoFocus({
  enabled,
  ref,
}: {
  enabled: boolean
  ref: React.RefObject<HTMLFormElement>
}) {
  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null

    if (!enabled) return

    // wait until the scroll is finished before focusing the next input.
    // this prevents the scroll from being interrupted by the focus.
    timeout = setTimeout(() => {
      const autofocusTarget = ref.current?.querySelector(
        '[data-autofocus-target]'
      )

      if (autofocusTarget instanceof HTMLElement) {
        autofocusTarget.focus()
      }
    }, 200)

    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [enabled, ref])
}
