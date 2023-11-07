import { useRef, useEffect } from 'react'

type CallbackFn = () => void

export default function useInterval(callback: CallbackFn, delay: number) {
  const savedCallback = useRef<CallbackFn>()

  useEffect(() => {
    savedCallback.current = callback
  })

  useEffect(() => {
    function tick() {
      if (savedCallback.current !== undefined) {
        savedCallback.current()
      }
    }

    const id = setInterval(tick, delay)

    // run immediately
    tick()

    return () => clearInterval(id)
  }, [delay])
}
