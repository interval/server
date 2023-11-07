import { useCallback, useEffect, useMemo, useReducer } from 'react'
import {
  ImageSize,
  SerializableRecord,
  GridItem,
  HighlightColor,
} from '@interval/sdk/dist/ioSchema'
import { filterRows, sortRows } from '@interval/sdk/dist/utils/table'
import usePrevious from '~/utils/usePrevious'
import { DropdownMenuItemProps } from '~/components/DropdownMenu'

export const MAX_TABLE_PAGE_SIZE = 100

export type IVTableColumn = {
  key: string
  label?: string
  accessorKey?: string
  formatter?: (row: any) => string
}

export interface IVTableRow {
  key: string
  data: IVTableCells | GridItem
  isSelected?: boolean
  rawData?: any
  filterValue?: string
  menu?: DropdownMenuItemProps[]
}

export interface IVGridItem {
  key: string
  data: GridItem
  isSelected?: boolean
  filterValue?: string
  menu?: DropdownMenuItemProps[]
}

export interface IVTableCellValueObject {
  label: string | number | boolean | null | Date | bigint | undefined
  url?: string
  image?: {
    url: string
    alt?: string
    size?: ImageSize
    width?: ImageSize
    height?: ImageSize
  }
  value?: string | number | boolean | null | Date | bigint | undefined
  route?: string
  // Specifies whether the URL is internal, necessary in case both are specified
  isInternalActionUrl?: boolean
  params?: SerializableRecord
  highlightColor?: HighlightColor
}

export type IVTableCellValue = React.ReactNode | IVTableCellValueObject

export type IVTableCells = {
  [key: string]: IVTableCellValue
}

type BaseTableRecord<T> = {
  data: T
  key: string
  filterValue?: string
  isSelected?: boolean
  menu?: DropdownMenuItemProps[]
}

type TableState = {
  pageIndex: number
  pageSize: number
  totalRecords: number | undefined
  sortColumn: string | null
  sortDirection: null | 'asc' | 'desc'
  searchQuery: string
  data: BaseTableRecord<any>[]
  selectedKeys: Set<string>
  isSelectAll: boolean
  isFullTableInMemory: boolean
  isFetching: boolean
  isRemote: boolean
  shouldCacheRecords: boolean
  isRequestingDownload: boolean
}

export type UseTableProps = {
  data: IVTableRow[]
  columns: IVTableColumn[] | string[]
  totalRecords?: number
  isSortable?: boolean
  isFilterable?: boolean
  isSelectable?: boolean
  isDisabled?: boolean
  isDownloadable?: boolean
  orientation?: 'horizontal' | 'vertical'
  defaultPageSize?: number
  isRemote?: boolean
  shouldCacheRecords?: boolean
  selectedKeys?: string[]
}

export type UseTableResult<T = any> = {
  // data
  columns: IVTableColumn[]
  data: BaseTableRecord<T>[]
  currentPage: BaseTableRecord<T>[]

  // pagination
  pageIndex: number
  pageSize: number
  totalRecords: number | undefined
  totalPages: number | undefined
  currentPageStart: number
  currentPageEnd: number
  canPreviousPage: boolean
  canNextPage: boolean
  previousPage: () => void
  nextPage: () => void

  // sorting
  isSortable: boolean
  sortColumn: TableState['sortColumn']
  sortDirection: TableState['sortDirection']
  handleSort: (col: string) => void

  // selection
  isSelectable: boolean
  isSelectAll: boolean
  selectedKeys: Set<string>
  selectAll: (opts?: { skipWarning?: boolean }) => void
  selectNone: (opts?: { skipWarning?: boolean }) => void
  toggleRow: (key: string, event?: React.MouseEvent) => void
  setSelectedKeys: (keys: string[]) => void

  // search
  onSearch: (search: string) => void
  searchQuery: string
  isFilterable?: boolean

  // misc
  isDisabled: boolean
  cachesRecords: boolean
  isDownloadable: boolean
  hasRowMenus: boolean
  totalRecordsInBuffer: number
  isFullTableInMemory: boolean
  shouldCacheRecords: boolean
  isEmptyWithoutFilters: boolean
  isFetching: boolean
  dispatch: React.Dispatch<TableAction>

  isRequestingDownload: boolean
  onRequestDownload: () => void

  targetBuffer: number
  isBufferComplete: boolean
}

const initialState: TableState = {
  pageIndex: 0,
  pageSize: 0,
  totalRecords: undefined,
  sortColumn: null,
  sortDirection: null,
  searchQuery: '',
  data: [],
  selectedKeys: new Set(),
  isSelectAll: false,
  isFullTableInMemory: false,
  isFetching: false,
  isRemote: false,
  shouldCacheRecords: true,
  isRequestingDownload: false,
}

type TableAction =
  | { type: 'setPage'; page: number }
  | { type: 'nextPage' }
  | { type: 'previousPage' }
  | { type: 'sort'; column: string }
  | { type: 'search'; query: string }
  | {
      type: 'addRows'
      data: BaseTableRecord<any>[]
      totalRecords: number | undefined
    }
  | { type: 'toggleRow'; key: string; event?: React.MouseEvent }
  | { type: 'selectAll'; skipWarning?: boolean }
  | { type: 'selectNone'; skipWarning?: boolean }
  | { type: 'setSelectedKeys'; keys: string[] }
  | { type: 'requestDownload' }

const debug =
  typeof window !== 'undefined' && window.location.host.includes('localhost')

function reducer(state: TableState, payload: TableAction): TableState {
  if (debug) console.info('[dispatch]', payload.type, payload)

  switch (payload.type) {
    case 'addRows': {
      const newState: TableState = {
        ...state,
        isFetching: false,
      }

      if (
        !state.shouldCacheRecords ||
        payload.totalRecords !== state.totalRecords
      ) {
        if (debug) console.info('replacing rows')

        newState.data = payload.data
        newState.totalRecords = payload.totalRecords
      } else {
        if (debug) console.info('appending rows')

        const existingPages = state.data.map(({ key }) => key)
        const additions = payload.data.filter(
          p => !existingPages.includes(p.key)
        )

        if (additions.length) {
          newState.data = [...state.data, ...additions]
        }
        newState.totalRecords = payload.totalRecords
      }

      newState.isFullTableInMemory =
        newState.totalRecords === newState.data.length

      if (state.isRequestingDownload && newState.isFullTableInMemory) {
        newState.isRequestingDownload = false
      }

      return newState
    }

    case 'setPage': {
      const pageIndex = payload.page
      let isFetching = state.isFetching

      if (!state.shouldCacheRecords) {
        isFetching = true
        state.data = []
      } else {
        const pageEnd = (pageIndex + 1) * state.pageSize
        if (state.isRemote && state.data.length < pageEnd) {
          isFetching = true
        }
      }

      return {
        ...state,
        isFetching,
        pageIndex,
      }
    }

    case 'nextPage': {
      const pageIndex = state.pageIndex + 1
      let isFetching = state.isFetching

      if (!state.shouldCacheRecords) {
        isFetching = true
        state.data = []
      } else {
        const pageEnd = (pageIndex + 1) * state.pageSize
        if (state.isRemote && state.data.length < pageEnd) {
          isFetching = true
        }
      }

      return {
        ...state,
        isFetching,
        pageIndex,
      }
    }

    case 'previousPage': {
      const pageIndex = Math.max(0, state.pageIndex - 1)
      let isFetching = state.isFetching

      if (!state.shouldCacheRecords) {
        isFetching = true
        state.data = []
      }

      return {
        ...state,
        isFetching,
        pageIndex,
      }
    }

    case 'search': {
      if (payload.query === state.searchQuery) return state

      // searching remote tables always pings the host
      if (state.isRemote) {
        return {
          ...state,
          data: [],
          searchQuery: payload.query,
          isFullTableInMemory: false,
          isFetching: true,
          pageIndex: 0,
        }
      }

      // searching will be performed in applySortingAndFiltering()
      return {
        ...state,
        searchQuery: payload.query,
        pageIndex: 0,
      }
    }

    case 'sort': {
      if (state.isFetching) return state

      const sortColumn = String(payload.column)

      const nextState: TableState = {
        ...state,
        pageIndex: 0,
      }

      if (state.sortColumn !== sortColumn) {
        nextState.sortColumn = sortColumn
        nextState.sortDirection = 'asc'
      } else if (state.sortDirection === 'desc') {
        nextState.sortColumn = null
        nextState.sortDirection = null
      } else {
        nextState.sortColumn = sortColumn
        nextState.sortDirection = 'desc'
      }

      // clear stored data and perform sorting on the host
      if (!state.shouldCacheRecords || !state.isFullTableInMemory) {
        nextState.data = []
        nextState.isFetching = true
        nextState.isFullTableInMemory = false
      }

      return nextState
    }

    case 'toggleRow': {
      const selectedKeys: Set<string> = new Set(state.selectedKeys)

      if (state.selectedKeys.has(payload.key)) {
        selectedKeys.delete(payload.key)
      } else {
        let keys: string[] = [payload.key]

        if (payload.event?.shiftKey) {
          // the full in-memory data is filtered & sorted outside of the reducer,
          // but we need the use modified data to determine the range
          const { data } = applySortingAndFiltering(state)

          const lastKey = Array.from(state.selectedKeys.values()).pop()
          const lastIndex = data.findIndex(r => r.key === lastKey)
          const nextIndex = data.findIndex(r => r.key === payload.key)

          if (lastIndex > -1 && nextIndex > -1) {
            const min = Math.min(lastIndex, nextIndex)
            const max = Math.max(lastIndex, nextIndex)

            keys = data.slice(min, max + 1).map(r => r.key)
          }
        }

        keys.forEach(k => selectedKeys.add(k))
      }

      return {
        ...state,
        isSelectAll: false,
        selectedKeys,
      }
    }

    case 'selectAll': {
      if (state.isFullTableInMemory) {
        return {
          ...state,
          selectedKeys: new Set(state.data.map(({ key }) => key)),
          // do not set selectAll; no need to fetch all rows through state
        }
      }

      return {
        ...state,
        isSelectAll: true,
        // do not set selectedKeys; we will request the full set through state
      }
    }

    case 'selectNone': {
      return {
        ...state,
        isSelectAll: false,
        selectedKeys: new Set(),
      }
    }

    case 'setSelectedKeys': {
      return {
        ...state,
        selectedKeys: new Set(payload.keys),
      }
    }

    case 'requestDownload': {
      return {
        ...state,
        isRequestingDownload: true,
      }
    }
  }
}

/**
 * Sorts and filters rows if the full table is in memory.
 * We do this outside of the reducer so we don't have to store
 * a copy of the unmodified data set in the state.
 */
function applySortingAndFiltering(state: TableState) {
  if (!state.isFullTableInMemory) return state

  let filtered: BaseTableRecord<any>[] = state.data

  // filtering is always performed on the host when remote state is supported.
  if (!state.isRemote) {
    filtered = filterRows({
      queryTerm: state.searchQuery,
      data: state.data,
    })
  }

  const sorted = sortRows({
    data: filtered,
    column: state.sortColumn,
    direction: state.sortDirection,
  })

  return {
    ...state,
    // spread triggers useMemo() for getting currentPage
    data: [...sorted],
    totalRecords: sorted.length,
  }
}

export default function useTable<T>(props: UseTableProps): UseTableResult<T> {
  const {
    // the full set of records is sent in props.data prior to v0.28
    totalRecords = props.shouldCacheRecords
      ? props.isRemote
        ? props.totalRecords ?? 0
        : props.data.length
      : undefined,
    shouldCacheRecords = true,
    isSelectable = false,
    isDisabled = false,
    isRemote = false,
    isSortable = true,
    isFilterable = true,
    orientation = 'horizontal',
    data,
    selectedKeys,
  } = props

  const defaultPageSize =
    props.defaultPageSize ?? (orientation === 'vertical' ? 5 : 20)
  const pageSize =
    (defaultPageSize === Infinity ? totalRecords : defaultPageSize) ??
    defaultPageSize

  const [_state, dispatch] = useReducer(reducer, {
    ...initialState,
    isFetching:
      (isRemote && !shouldCacheRecords && data.length === 0) ||
      initialState.isFetching,
    totalRecords,
    isRemote,
    shouldCacheRecords,
    data,
    pageSize: Math.min(pageSize, MAX_TABLE_PAGE_SIZE),
    isFullTableInMemory:
      shouldCacheRecords && (!isRemote || data.length === totalRecords),
    selectedKeys: selectedKeys ? new Set(selectedKeys) : new Set<string>(),
  })

  const state = applySortingAndFiltering(_state)

  const totalPages =
    state.totalRecords !== undefined
      ? Math.ceil(state.totalRecords / state.pageSize)
      : undefined

  // group these together as a single update when received from props
  const newPayload = useMemo(
    () => ({ data, totalRecords }),
    [data, totalRecords]
  )

  const prevPayload = usePrevious(newPayload)

  useEffect(() => {
    // Don't immediately addRows for the initial data
    if (prevPayload && newPayload !== prevPayload) {
      dispatch({ type: 'addRows', ...newPayload })
    }
  }, [newPayload, prevPayload])

  const columns: IVTableColumn[] = useMemo(
    () =>
      props.columns.map((col: IVTableColumn | string, index: number) => {
        if (typeof col === 'string') {
          return {
            key: col,
            accessorKey: col,
            label: col,
          }
        }

        return {
          key: col.accessorKey ?? index.toString(),
          accessorKey: col.accessorKey,
          label: col.label,
        }
      }),
    [props.columns]
  )

  const currentPage: BaseTableRecord<T>[] = useMemo(() => {
    if (!shouldCacheRecords) return state.data.slice(0, state.pageSize)

    const start = state.pageSize * state.pageIndex

    return state.data.slice(start, start + state.pageSize).map(p => ({
      ...p,
      isSelected: !!state.selectedKeys.has(p.key),
    }))
  }, [
    shouldCacheRecords,
    state.data,
    state.pageIndex,
    state.pageSize,
    state.selectedKeys,
  ])

  const hasRowMenus = !!currentPage.find(
    r => r.menu?.length && r.menu.length > 0
  )

  const isEmptyWithoutFilters = state.totalRecords === 0 && !state.searchQuery

  const currentPageStart = state.pageIndex * state.pageSize + 1
  const currentPageEnd = Math.max(
    currentPageStart,
    (state.isFetching
      ? currentPageStart + state.pageSize
      : currentPageStart + currentPage.length) - 1
  )

  const onSearch = useCallback(
    (query: string) => dispatch({ type: 'search', query }),
    []
  )
  const onRequestDownload = useCallback(
    () => dispatch({ type: 'requestDownload' }),
    []
  )

  let targetBuffer = MAX_TABLE_PAGE_SIZE * (state.pageIndex + 3)

  if (
    (state.isRequestingDownload || state.isSelectAll) &&
    state.totalRecords !== undefined
  ) {
    targetBuffer = state.totalRecords
  }

  const isBufferComplete =
    !state.isRequestingDownload &&
    !state.isSelectAll &&
    state.data.length >= targetBuffer

  return {
    ...state,
    columns,
    currentPage,
    totalPages,
    totalRecords: state.totalRecords,
    canPreviousPage:
      state.pageIndex > 0 && (shouldCacheRecords || !state.isFetching),
    canNextPage:
      (totalPages !== undefined
        ? state.pageIndex < totalPages - 1
        : state.data.length >= state.pageSize) &&
      (shouldCacheRecords || !state.isFetching),
    currentPageStart,
    currentPageEnd,
    previousPage: () => dispatch({ type: 'previousPage' }),
    nextPage: () => dispatch({ type: 'nextPage' }),
    isSortable,
    isFilterable,
    handleSort: col => dispatch({ type: 'sort', column: col }),
    onSearch,
    isSelectable,
    isDisabled,
    hasRowMenus,
    selectAll: () => dispatch({ type: 'selectAll' }),
    selectNone: () => dispatch({ type: 'selectNone' }),
    toggleRow: (key, event) => dispatch({ type: 'toggleRow', key, event }),
    setSelectedKeys: keys => dispatch({ type: 'setSelectedKeys', keys }),
    totalRecordsInBuffer: state.data.length,
    cachesRecords: shouldCacheRecords,
    isDownloadable: props.isDownloadable ?? false,
    isEmptyWithoutFilters,
    dispatch,
    onRequestDownload,
    targetBuffer,
    isBufferComplete,
  }
}
