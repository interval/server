import type { Location } from 'react-router-dom'

/**
 * Use history state to get queuedActionId to not clobber any
 * user-set search params.
 */
export function getQueuedActionId(location: Location): string | undefined {
  const state = location.state
  if (
    state &&
    typeof state === 'object' &&
    !Array.isArray(state) &&
    'queuedActionId' in state
  ) {
    const newState = state as { queuedActionId: unknown }
    if (typeof newState.queuedActionId === 'string') {
      return newState.queuedActionId
    }
  }
}
