import { useCallback, useState } from 'react'
import { logger } from './logger'

// Optionally sync Recoil values with local storage using atom effects
// src: https://recoiljs.org/docs/guides/atom-effects/#local-storage-persistence
export const localStorageRecoilEffect = (key: string) => {
  return ({ setSelf, onSet }) => {
    if (typeof window !== 'undefined') {
      const savedValue = localStorage.getItem(key)
      if (savedValue != null) {
        setSelf(JSON.parse(savedValue))
      }

      onSet((newValue, _, isReset) => {
        isReset || newValue === null
          ? localStorage.removeItem(key)
          : localStorage.setItem(key, JSON.stringify(newValue))
      })
    }
  }
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      logger.warn('Error getting localStorage value', { error })
      return initialValue
    }
  })

  const setAndStoreValue = useCallback(
    (val: T | ((val: T) => T)) => {
      try {
        const valueToStore = val instanceof Function ? val(value) : val

        setValue(valueToStore)

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore))
        }
      } catch (error) {
        logger.error('Error setting localStorage value', { error })
      }
    },
    [key, value, logger]
  )

  return [value, setAndStoreValue] as const
}
