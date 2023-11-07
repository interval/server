import { useEffect, useRef } from 'react'
import { reportsAsAppleDevice } from './usePlatform'

const didReportAsAppleDevice = reportsAsAppleDevice()

export default function useSubmitFormWithShortcut(opts?: { enabled?: boolean }) {
  const formRef = useRef<HTMLFormElement>(null)
  const { enabled = true } = opts || {}

  useEffect(() => {
    /*
    This seems convoluted (using formRef to call requestSubmit) but it's "on purpose:"
    - The value of onSubmit is _really_ unstable. The functions it calls like onRespond are not memoized
    - It's "safe" because it ensures CMD+Enter does _exactly_ what clicking "submit" would do
    */
    function triggerSubmit(ev: KeyboardEvent) {
      const isModifierKeyPressed = didReportAsAppleDevice
        ? ev.metaKey
        : ev.ctrlKey

      if (isModifierKeyPressed && ev.key === 'Enter' && enabled) {
        formRef.current?.requestSubmit()
      }
    }

    document.addEventListener('keydown', triggerSubmit)

    return () => {
      document.removeEventListener('keydown', triggerSubmit)
    }
  }, [enabled])

  return { formRef }
}
