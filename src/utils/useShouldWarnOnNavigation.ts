import { useEffect, useMemo } from 'react'
import { RenderIOCallProps } from '~/components/RenderIOCall'
import useRenderContext from '~/components/RenderContext'

function isBackgroundable(action: {
  backgroundable: boolean | null
  metadata?: { backgroundable?: boolean | null } | null
}) {
  return action.metadata?.backgroundable ?? action.backgroundable
}

export default function useShouldWarnOnNavigation(
  props: RenderIOCallProps & { isTouched: boolean }
) {
  const {
    state,
    context,
    mode,
    transaction,
    isTouched,
    initialInputGroupKey,
    inputGroupKey,
    isCurrentCall,
  } = props

  const { setNavigationWarning } = useRenderContext()

  const shouldWarn = useMemo(
    () =>
      Boolean(
        isCurrentCall &&
          state !== 'REDIRECTING' &&
          state !== 'COMPLETED' &&
          context === 'transaction' &&
          mode === 'live' &&
          transaction &&
          transaction.action.warnOnClose &&
          (isTouched ||
            (!isBackgroundable(transaction.action) &&
              initialInputGroupKey !== inputGroupKey))
      ),
    [
      isCurrentCall,
      state,
      initialInputGroupKey,
      inputGroupKey,
      isTouched,
      context,
      mode,
      transaction,
    ]
  )

  useEffect(() => {
    if (setNavigationWarning) {
      setNavigationWarning({ shouldWarn, isTouched })
    }

    // clean up on unmount
    return () => {
      if (setNavigationWarning) {
        setNavigationWarning({ shouldWarn: false, isTouched: false })
      }
    }
  }, [setNavigationWarning, shouldWarn, isTouched])
}
