import { useState, useEffect } from 'react'
import { usePrompt } from './navigationHooks'

export const DIRTY_FORM_MESSAGE =
  'This page has unsaved changes, are you sure you want to exit?'
export const CLOSE_TRANSACTION_MESSAGE =
  'Leaving this page will close the current transaction, are you sure you want to exit?'
export const NEW_TRANSACTION_MESSAGE =
  'Starting a new transaction will close the current transaction, are you sure you want to start over?'
export const NEW_TRANSACTION_BACKGROUNDABLE_MESSAGE =
  'Starting a new transaction will not close the current transaction, you can resume it later from the dashboard.'

function handleBeforeUnload() {
  // This message isn't actually displayed in modern browers
  return CLOSE_TRANSACTION_MESSAGE
}

export default function useTransactionNavigationWarning() {
  const [navigationWarning, setNavigationWarning] = useState<{
    shouldWarn: boolean
    isTouched: boolean
  }>({
    shouldWarn: false,
    isTouched: false,
  })

  usePrompt(
    navigationWarning.isTouched
      ? DIRTY_FORM_MESSAGE
      : CLOSE_TRANSACTION_MESSAGE,
    navigationWarning.shouldWarn
  )

  useEffect(() => {
    if (navigationWarning.shouldWarn) {
      window.addEventListener('beforeunload', handleBeforeUnload)
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload)
      }
    }
  }, [navigationWarning.shouldWarn])

  return { setNavigationWarning }
}
