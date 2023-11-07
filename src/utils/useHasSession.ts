import { useState, useEffect, useCallback } from 'react'
import { checkSession, AuthenticationError } from './auth'
import { logger } from '~/utils/logger'

export default function useHasSession() {
  const [state, setState] = useState({
    isLoading: true,
    hasSession: false,
    needsMfa: false,
  })

  const refetch = useCallback(async () => {
    setState(state => ({
      ...state,
      isLoading: true,
    }))
    return checkSession()
      .then(hasSession => {
        setState({
          hasSession,
          isLoading: false,
          needsMfa: false,
        })
      })
      .catch(error => {
        logger.error('Error checking user session', { error })
        if (
          error instanceof AuthenticationError &&
          error.code === 'NEEDS_MFA'
        ) {
          setState({
            hasSession: false,
            isLoading: false,
            needsMfa: true,
          })
        }
      })
  }, [logger])

  useEffect(() => {
    refetch()
  }, [refetch])

  return {
    ...state,
    refetch,
  }
}
