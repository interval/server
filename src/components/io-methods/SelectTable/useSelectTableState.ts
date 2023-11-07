import { T_IO_STATE } from '@interval/sdk/dist/ioSchema'
import { useMemo, useRef, useEffect } from 'react'
import { UseTableResult } from '~/components/IVTable/useTable'
import { pluralizeWithCount } from '~/utils/text'
import { IOComponentError } from '~/components/RenderIOCall/ComponentError'
import { RCTResponderProps } from '~/components/RenderIOCall'

export default function useSelectTableState(
  table: UseTableResult,
  props: Pick<
    RCTResponderProps<'SELECT_TABLE'>,
    | 'selectedKeys'
    | 'onStateChange'
    | 'onUpdatePendingReturnValue'
    | 'minSelections'
    | 'maxSelections'
    | 'isOptional'
    | 'totalRecords'
    | 'data'
  >
) {
  const { onStateChange } = props
  const { dispatch, isFullTableInMemory, isBufferComplete } = table

  const state = useMemo(
    (): T_IO_STATE<'SELECT_TABLE'> => ({
      queryTerm: table.searchQuery,
      sortColumn: table.sortColumn,
      sortDirection: table.sortDirection,
      offset: table.currentPageStart - 1,
      isSelectAll: table.isSelectAll,
      pageSize: table.pageSize,
    }),
    [
      table.searchQuery,
      table.sortColumn,
      table.sortDirection,
      table.isSelectAll,
      table.pageSize,
      table.currentPageStart,
    ]
  )

  // request the full set of selected keys from the host when the user selects all rows
  useEffect(() => {
    if (!props.selectedKeys) return

    // this useEffect is only for applying the full set of keys
    if (!table.isSelectAll) return

    dispatch({ type: 'setSelectedKeys', keys: props.selectedKeys })
  }, [props.selectedKeys, dispatch, table.isSelectAll])

  useEffect(() => {
    if (isFullTableInMemory || isBufferComplete) return

    onStateChange(state)
  }, [onStateChange, state, isFullTableInMemory, isBufferComplete])

  const {
    onUpdatePendingReturnValue,
    minSelections,
    maxSelections,
    isOptional,
  } = props

  const isRemoteEnabled = 'totalRecords' in props

  useEffect(() => {
    const selectionCount = table.selectedKeys.size

    if (isOptional && selectionCount === 0) {
      onUpdatePendingReturnValue(undefined)
    } else if (minSelections !== undefined && selectionCount < minSelections) {
      onUpdatePendingReturnValue(
        new IOComponentError(
          `Please make at least ${pluralizeWithCount(
            minSelections,
            'selection',
            'selections'
          )}.`
        )
      )
    } else if (maxSelections !== undefined && selectionCount > maxSelections) {
      onUpdatePendingReturnValue(
        new IOComponentError(
          `Please make no more than ${pluralizeWithCount(
            maxSelections,
            'selection',
            'selections'
          )}.`
        )
      )
    } else {
      if (isRemoteEnabled) {
        onUpdatePendingReturnValue(
          Array.from(table.selectedKeys.values()).map(key => ({ key }))
        )
      } else {
        const rows = props.data.filter(row => table.selectedKeys.has(row.key))
        onUpdatePendingReturnValue(rows)
      }
    }
  }, [
    table.selectedKeys,
    onUpdatePendingReturnValue,
    minSelections,
    maxSelections,
    isOptional,
    isRemoteEnabled,
    props.data,
  ])

  return null
}
