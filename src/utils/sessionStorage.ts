import { useEffect, useState } from 'react'

export function useSessionStorage<T extends string | undefined>(
  key: string,
  defaultValue?: T
): [string | undefined, (val: T) => void] {
  const [value, setValue] = useState<string | undefined>(defaultValue)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const val = window.sessionStorage.getItem(key)

      if (val) {
        setValue(val)
      } else {
        setValue(defaultValue)
      }
    }
  }, [key, defaultValue])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (value) {
        window.sessionStorage.setItem(key, value)
      } else {
        window.sessionStorage.removeItem(key)
      }
    }
  }, [key, value])

  return [value, setValue]
}
