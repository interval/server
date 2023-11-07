import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { inferMutationOutput, trpc } from '~/utils/trpc'
import { UI_STATE } from './useTransaction'
import { useSetRecoilState } from 'recoil'
import { hasRecentlyConnectedToConsole } from '~/pages/dashboard/[orgSlug]/develop'
import { useStateFlagEnabled } from '~/utils/navigationHooks'
import usePrevious from '~/utils/usePrevious'

export default function useConsole({
  actionSlug,
  queuedActionId,
}: {
  actionSlug: string
  queuedActionId?: string
}) {
  const [searchParams] = useSearchParams()
  // `undefined` indicates to fetch most recent existing transaction if possible
  // `null` indicates to explicitly get new transaction
  const [existingTransactionId, setExistingTransactionId] = useState<
    string | null | undefined
  >(null)
  const [prevTransactionState, setPrevTransactionState] =
    useState<UI_STATE | null>(null)

  // cache the most recent transaction object between useMutation queries.
  // without this, important components will unmount while we reload the transaction query.
  const [transactionObject, setTransactionObject] =
    useState<inferMutationOutput<'transaction.add'> | null>(null)

  // until we separate socket connections from transactions, we update this global UI state when
  // a connection comes online. as long as you don't refresh the page (e.g. navigating around the Console),
  // if your host disconnects we show a "reconnecting" message instead of an empty state.
  const setHasRecentlyConnected = useSetRecoilState(
    hasRecentlyConnectedToConsole
  )

  const transaction = trpc.useMutation('transaction.add', {
    retry: false,
  })

  const { reset: resetConnected } = transaction

  useEffect(() => {
    setExistingTransactionId(null)
  }, [actionSlug])

  useEffect(() => {
    setExistingTransactionId(null)
  }, [searchParams])

  const prevSearchParams = usePrevious(searchParams)

  useStateFlagEnabled(
    'shouldCreateNewTransaction',
    () => {
      if (searchParams === prevSearchParams) {
        setExistingTransactionId(null)
      }
    },
    [searchParams, prevSearchParams]
  )

  const [isWaiting, setIsWaiting] = useState(false)

  useEffect(() => {
    if (
      !transaction.isLoading &&
      !isWaiting &&
      (!transaction.data || existingTransactionId !== transaction.data.id)
    ) {
      transaction.mutate(
        {
          environment: 'DEVELOPMENT',
          actionSlug,
          queuedActionId,
          id: existingTransactionId,
        },
        {
          onSuccess(transaction) {
            setExistingTransactionId(transaction.id)
            setTransactionObject(transaction)
          },
          onError() {
            // Retry again after a short delay
            const retryMs = 1000
            setIsWaiting(true)
            setTimeout(() => {
              setIsWaiting(false)
            }, retryMs)
          },
        }
      )
    }
  }, [
    actionSlug,
    queuedActionId,
    existingTransactionId,
    transaction,
    isWaiting,
  ])

  useEffect(() => {
    if (prevTransactionState === 'IN_PROGRESS') {
      setHasRecentlyConnected(true)
    }
  }, [setHasRecentlyConnected, prevTransactionState])

  const handleStateChange = useCallback(
    (state: UI_STATE) => {
      if (state === 'HOST_DROPPED' || state === 'HOST_NOT_FOUND') {
        setExistingTransactionId(null)
        resetConnected()
      } else if (
        state === 'COMPLETED' &&
        prevTransactionState === 'IN_PROGRESS'
      ) {
        resetConnected()
      }

      setPrevTransactionState(state)
    },
    [resetConnected, prevTransactionState]
  )

  const onNewTransaction = useCallback(
    (existingTransactionId?: string) => {
      setTransactionObject(null)
      setExistingTransactionId(existingTransactionId ?? null)
      setPrevTransactionState(null)
      resetConnected()
    },
    [resetConnected]
  )

  return {
    handleStateChange,
    prevTransactionState,
    existingTransactionId,
    isLoading: transaction.isLoading,
    transaction: transactionObject,
    error: transaction.error,
    onNewTransaction,
  }
}
