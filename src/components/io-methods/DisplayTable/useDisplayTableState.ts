import { T_IO_STATE } from '@interval/sdk/dist/ioSchema'
import { useMemo, useRef, useEffect } from 'react'
import { UseTableResult } from '~/components/IVTable/useTable'
import { RCTResponderProps } from '~/components/RenderIOCall'

export default function useDisplayTableState(
  table: UseTableResult,
  props: Pick<
    RCTResponderProps<'DISPLAY_TABLE'>,
    'isStateful' | 'isAsync' | 'onStateChange'
  >
) {
  const { isStateful = false, onStateChange, isAsync } = props
  const { isFullTableInMemory, isBufferComplete, isRequestingDownload } = table

  const currentBufferSize = table.data.length

  const offset = isRequestingDownload
    ? currentBufferSize
    : table.currentPageStart - 1

  const state = useMemo(
    (): T_IO_STATE<'DISPLAY_TABLE'> => ({
      queryTerm: table.searchQuery ?? undefined,
      sortColumn: table.sortColumn ?? undefined,
      sortDirection: table.sortDirection ?? undefined,
      offset,
      pageSize: table.pageSize,
    }),
    [
      table.searchQuery,
      table.sortColumn,
      table.sortDirection,
      table.pageSize,
      offset,
    ]
  )

  useEffect(() => {
    if (!isAsync && (!isStateful || isFullTableInMemory || isBufferComplete))
      return

    onStateChange(state)
  }, [
    isStateful,
    isAsync,
    onStateChange,
    state,
    isFullTableInMemory,
    isBufferComplete,
  ])

  return state
}
