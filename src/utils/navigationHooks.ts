/**
 * These hooks re-implement the now removed useBlocker and usePrompt hooks in 'react-router-dom'.
 * Source: https://gist.github.com/rmorse/426ffcc579922a82749934826fa9f743
 * Source: https://github.com/remix-run/react-router/commit/256cad70d3fd4500b1abcfea66f3ee622fb90874#diff-b60f1a2d4276b2a605c05e19816634111de2e8a4186fe9dd7de8e344b65ed4d3L344-L381
 */
import { useContext, useEffect, useCallback } from 'react'
import {
  UNSAFE_NavigationContext as NavigationContext,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { Blocker, Transition } from 'history'
import { trpc } from './trpc'
import usePrevious from './usePrevious'

interface NavigatorWithBlock extends Navigator {
  block: (blocker: Blocker) => () => void
}

/**
 * Blocks all navigation attempts. This is useful for preventing the page from
 * changing until some condition is met, like saving form data.
 *
 * @param  blocker
 * @param  when
 * @see https://reactrouter.com/api/useBlocker
 */
export function useBlocker(blocker: Blocker, when = true) {
  const { navigator } = useContext(NavigationContext)

  useEffect(() => {
    if (!when) return

    const unblock = (navigator as unknown as NavigatorWithBlock).block(tx => {
      const autoUnblockingTx = {
        ...tx,
        retry() {
          // Automatically unblock the transition so it can play all the way
          // through before retrying it. TODO: Figure out how to re-enable
          // this block if the transition is cancelled for some reason.
          unblock()
          tx.retry()
        },
      }

      blocker(autoUnblockingTx)
    })

    return unblock
  }, [navigator, blocker, when])
}

/**
 * Prompts the user with an Alert before they leave the current screen.
 *
 * @param  message
 * @param  when
 */
export function usePrompt(message: string, when = true) {
  const blocker = useCallback(
    (tx: Transition) => {
      const { state } = tx.location
      let shouldShowPromptState = true
      if (state && typeof state === 'object' && 'shouldShowPrompt' in state) {
        shouldShowPromptState = !!(state as { shouldShowPrompt: unknown })
          .shouldShowPrompt
      }

      if (!shouldShowPromptState || window.confirm(message)) {
        tx.retry()
      }
    },
    [message]
  )

  useBlocker(blocker, when)
}

type ConfiguredStateFlag = 'shouldCreateNewTransaction'

export function useStateFlagEnabled(
  flag: ConfiguredStateFlag,
  onChange: () => void,
  deps?: any[]
) {
  const navigate = useNavigate()
  const { state } = useLocation()
  let flagEnabled = false
  if (state && typeof state === 'object' && flag in state) {
    flagEnabled = !!(state as object)[flag]
  }

  useEffect(() => {
    if (flagEnabled) {
      onChange()

      // Clear the flag's state
      const newState = {
        ...(state as object),
      }
      delete newState[flag]
      navigate(
        {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        },
        {
          state: newState,
          replace: true,
        }
      )
    }
    // We only want this to run when the flag changes, along with any provided deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flagEnabled, ...(deps ?? [])])
}

/**
 * Reloads the page after navigation if the server and client git revisions aren't matching.
 */
export function useCheckCommitRev({
  reloadOnFocus = false,
}: { reloadOnFocus?: boolean } = {}) {
  const location = useLocation()
  const prevLocation = usePrevious(location)
  const clientRev = process.env.GIT_COMMIT
  const serverRev = trpc.useQuery(['app.commit-rev'])

  const { isLoading, data: serverRevData } = serverRev
  useEffect(() => {
    if (
      (reloadOnFocus || location.pathname !== prevLocation?.pathname) &&
      !isLoading &&
      clientRev !== serverRevData
    ) {
      window.location.reload()
    }
  }, [
    reloadOnFocus,
    location,
    prevLocation,
    isLoading,
    clientRev,
    serverRevData,
  ])
}
