import { useCallback } from 'react'
import { trpc } from './trpc'

export function useUploadUrlFetcher({
  transactionId,
  inputGroupKey,
}: {
  transactionId?: string
  inputGroupKey?: string
}) {
  const { mutateAsync: getUrls } = trpc.useMutation(['uploads.io.urls'])

  const getUploadUrls = useCallback(
    async ({ objectKeys }: { objectKeys: string[] }) => {
      if (!transactionId || !inputGroupKey) {
        return
      }

      return getUrls({
        objectKeys,
        transactionId,
        inputGroupKey,
      })
    },
    [getUrls, inputGroupKey, transactionId]
  )

  return getUploadUrls
}
