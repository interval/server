import { UseTableResult } from './useTable'
import DesktopTable from './DesktopTable'
import { numberWithCommas } from '~/utils/text'

export interface IVTableProps {
  table: UseTableResult
  tableKey?: string
  containerClassName?: string
  emptyMessage?: string
  orientation?: 'vertical' | 'horizontal'
  /*
    Set to true to give all cells a fixed width. Best for user-supplied content.
    See table.css for an explanation.
  */
  fixedWidthColumns?: boolean
  /*
    Set to true to hide all columns except for the first column on mobile.
    Useful for adding custom-formatted information beneath the row title.
  */
  hideMobileColumns?: boolean
  /**
   * Set to true to memoize table rows based on their key to prevent constant re-renders.
   * Primarily for transaction tables, whose data is not expected to update mid-render.
   * Dashboard tables with editable contents should not use this setting.
   */
  useMemoizedRows?: boolean
  selectionCriteria?: {
    min?: number
    max?: number
    selected: number
  }
  showControls?: boolean
  renderMarkdown?: boolean
  filename?: string
  shouldTruncate?: boolean
}

export type PaginationProps = Pick<
  UseTableResult,
  | 'previousPage'
  | 'canPreviousPage'
  | 'nextPage'
  | 'canNextPage'
  | 'totalPages'
  | 'pageIndex'
> & {
  totalRecords: number | undefined
  currentPageStart: number
  currentPageEnd: number
}

export function Pagination(props: PaginationProps) {
  const buttonClassName =
    'text-gray-500 border border-gray-200 rounded text-[13px] py-0.5 leading-5 inline-block px-2 hover:text-gray-900 cursor-pointer disabled:cursor-default disabled:text-opacity-20 disabled:border-gray-100 flex items-center justify-center'

  return (
    <div className="flex items-center space-x-1" data-pw="pagination">
      <div className="text-[13px] text-gray-500 pr-1">
        {/* eslint-disable-next-line no-extra-boolean-cast */}
        {!!props.totalRecords ? (
          <>
            <>{`${props.currentPageStart} - ${props.currentPageEnd}`}</>
            <> of {numberWithCommas(props.totalRecords)}</>
          </>
        ) : (
          <>0 records</>
        )}
      </div>
      <button
        className={buttonClassName}
        onClick={() => {
          if (!props.canPreviousPage) return

          props.previousPage()
        }}
        disabled={!props.canPreviousPage}
        type="button"
        aria-label="Previous page"
      >
        Prev
      </button>
      <button
        className={buttonClassName}
        onClick={() => {
          if (!props.canNextPage) return

          props.nextPage()
        }}
        disabled={!props.canNextPage}
        type="button"
        aria-label="Next page"
      >
        Next
      </button>
    </div>
  )
}

export default function IVTable(props: IVTableProps) {
  return <DesktopTable {...props} />
}
