import { MutableRefObject, useEffect, useRef } from 'react'

export default function usePrevious<T>(
  value: T
): MutableRefObject<T | undefined>['current'] {
  const ref = useRef<T>()
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref.current
}
