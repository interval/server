import React, { useState, useRef, useEffect, useCallback } from 'react'
import { ScrollSync, ScrollSyncPane } from 'react-scroll-sync'
import classNames from 'classnames'
import { IVTableProps, Pagination } from '.'
import {
  IVTableCellValue,
  IVTableCells,
  IVTableColumn,
  IVTableRow,
  UseTableResult,
} from './useTable'
import { numberWithCommas, pluralizeWithCount } from '~/utils/text'
import DesktopVerticalTable from './VerticalTable'
import TableDownloader from './TableDownloader'
import TableRowMenu from './TableRowMenu'
import useDisableSelectionWithShiftKey from '~/utils/useDisableSelectionWithShiftKey'
import IVSpinner from '~/components/IVSpinner'
import SortUpIcon from '~/icons/compiled/SortUp'
import SortDownIcon from '~/icons/compiled/SortDown'
import InfoIcon from '~/icons/compiled/Info'
import SearchIcon from '~/icons/compiled/Search'
import CloseIcon from '~/icons/compiled/Close'
import RenderValue from '../RenderValue'
import { preventDefaultInputEnterKey } from '~/utils/preventDefaultInputEnter'
import useResizeObserver from '@react-hook/resize-observer'

const CHECKBOX_COLUMN_WIDTH = 41 // includes 1px border on right
const HEADER_HEIGHT = 41 // includes 1px border
const MAX_CELL_WIDTH = 600
const MIN_CELL_WIDTH = 41

type OrientationTableProps = IVTableProps & {
  tableRef: (node: HTMLDivElement) => void
  columnSizes: number[]
}

/**
 * DesktopHorizontalTable consists of two separate elements:
 * - A scrolling, sticky header containing the controls (search, pagination, etc) and the column headers
 * - The table body
 *
 * The separate header is required because sticky headers don't work for horizontally scrolling tables.
 * We use react-scroll-sync to scroll both elements together.
 */
function DesktopHorizontalTable(props: OrientationTableProps) {
  const [lastRowsCount, setLastRowsCount] = useState(10)
  const stableComponentId = useRef(Math.random().toString(36).substring(2, 15))

  const RowComponent = props.useMemoizedRows
    ? MemoizedHorizontalTableRow
    : HorizontalTableRow

  useEffect(() => {
    if (!props.table.currentPage.length) return
    setLastRowsCount(props.table.currentPage.length)
  }, [props.table.currentPage.length])

  if (props.table.isEmptyWithoutFilters && !props.table.isFetching) {
    return (
      <div className="text-center py-16 px-4 text-gray-500">
        <p>{props.emptyMessage}</p>
      </div>
    )
  }

  return (
    <div
      className={classNames('relative', {
        'iv-table--fixed-columns': props.fixedWidthColumns,
      })}
    >
      <HorizontalTableHeader {...props} />
      {props.table.currentPage.length > 0 ? (
        <ScrollSyncPane group="a">
          <div className="overflow-x-auto">
            <div
              className="min-w-full w-auto bg-white relative table whitespace-nowrap"
              data-pw-search={props.table.searchQuery}
              ref={props.tableRef}
              style={{
                // moves the invisible header row behind the actual header
                marginTop: -1 * HEADER_HEIGHT,
              }}
            >
              {/* this invisible row appears behind the header and factors in column labels for width calculations */}
              <div
                className="table-row invisible"
                // subtract 1px for the border
                style={{ height: HEADER_HEIGHT - 1 }}
                aria-hidden="true"
              >
                {props.table.isSelectable && (
                  <div
                    className="table-cell"
                    style={{
                      width: CHECKBOX_COLUMN_WIDTH,
                      minWidth: CHECKBOX_COLUMN_WIDTH,
                    }}
                  >
                    &nbsp;
                  </div>
                )}
                {props.table.columns.map((column, index) => (
                  <div key={index} className="table-cell pl-3 pr-6">
                    {column.label ?? column.accessorKey}
                  </div>
                ))}
                {props.table.hasRowMenus && (
                  <div className="w-[43px] table-cell">&nbsp;</div>
                )}
              </div>

              {props.table.currentPage.map(row => (
                <RowComponent
                  key={[stableComponentId.current, row.key].join('-')}
                  tableKey={props.tableKey}
                  columns={props.table.columns}
                  row={row}
                  isDisabled={props.table.isDisabled}
                  isSelectable={props.table.isSelectable}
                  onToggleRow={(key, event) => {
                    if (
                      props.selectionCriteria?.min === 1 &&
                      props.selectionCriteria?.max === 1 &&
                      !props.table.selectedKeys.has(key)
                    ) {
                      props.table.setSelectedKeys([key])
                    } else {
                      props.table.toggleRow(key, event)
                    }
                  }}
                  columnSizes={props.columnSizes}
                  fixedWidthColumns={props.fixedWidthColumns}
                  hasRowMenus={props.table.hasRowMenus}
                  renderMarkdown={props.renderMarkdown}
                  shouldTruncate={props.shouldTruncate}
                />
              ))}
            </div>
          </div>
        </ScrollSyncPane>
      ) : (
        <>
          {props.table.isFetching ? (
            // loading state consists of empty rows x the previous number of rows
            <div className="w-full overflow-x-auto relative border-b border-gray-200 ">
              {Array.from({ length: lastRowsCount }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-[41px] border-t border-gray-100 first:border-t-0"
                >
                  &nbsp;
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4 text-gray-500 border-y border-gray-100">
              {props.table.searchQuery ? (
                <p>No records found matching '{props.table.searchQuery}'</p>
              ) : (
                <p>No records found</p>
              )}
            </div>
          )}
        </>
      )}
      {props.showControls && !props.table.isEmptyWithoutFilters && (
        <TableControls location="bottom" {...props} />
      )}
    </div>
  )
}

function HorizontalTableHeader(props: OrientationTableProps) {
  const [isStuck, setIsStuck] = useState(false)
  const headerEl = useRef<HTMLDivElement>(null)

  // toggle .rounded-t-lg when the header becomes stuck/unstuck
  useEffect(() => {
    if (!headerEl.current) return

    const observer = new IntersectionObserver(
      ([e]) => setIsStuck(e.intersectionRatio < 1),
      { threshold: [1] }
    )

    observer.observe(headerEl.current)
  }, [])

  const thClassName = 'py-2.5 whitespace-nowrap text-left font-medium'

  const hasSelectedRows = props.table.selectedKeys.size > 0
  const areAllRowsSelected =
    props.table.selectedKeys.size === props.table.totalRecords &&
    props.table.totalRecords > 0

  return (
    <div
      className={classNames('w-full bg-white sticky -top-0.5 z-10', {
        'rounded-t-lg': !isStuck,
        'border-t-2 border-t-gray-200': isStuck,
      })}
      ref={headerEl}
    >
      {props.showControls && (
        <TableControls location="top" {...props} isStuck={isStuck} />
      )}

      <div
        className={classNames(
          'relative',
          'after:absolute after:right-0 after:top-px after:bottom-px',
          {
            'after:bg-white': !props.showControls,
            'after:bg-[#f9fafb]': props.showControls,
            'after:block after:w-[43px]': props.table.hasRowMenus,
          }
        )}
      >
        <ScrollSyncPane group="a">
          <div
            aria-hidden="true"
            className={classNames(
              'w-full overflow-x-auto no-scrollbar relative min-h-[41px] border-b border-gray-200',
              {
                'border-t border-gray-200 bg-[#f9fafb]': props.showControls,
                'bg-white': !props.showControls,
              }
            )}
          >
            <div className={`text-left inline-flex min-w-full`}>
              {props.table.isSelectable && (
                <div
                  className={classNames(
                    thClassName,
                    'sticky flex items-center justify-center left-0 z-10 border-r border-gray-200 pr-px',
                    {
                      'bg-white': !props.showControls,
                      'bg-[#f9fafb]': props.showControls,
                    }
                  )}
                  style={{ width: CHECKBOX_COLUMN_WIDTH }}
                >
                  {
                    // Disable "select all" for single-selection tables
                    !(
                      props.selectionCriteria?.min === 1 &&
                      props.selectionCriteria?.max === 1
                    ) && (
                      <input
                        type="checkbox"
                        aria-label={
                          areAllRowsSelected ? 'Select none' : 'Select all'
                        }
                        className={classNames('relative -top-px', {
                          indeterminate: hasSelectedRows && !areAllRowsSelected,
                        })}
                        checked={areAllRowsSelected}
                        disabled={props.table.isDisabled}
                        onChange={e => {
                          if (e.target.checked && !hasSelectedRows) {
                            props.table.selectAll()
                          } else {
                            props.table.selectNone()
                          }
                        }}
                      />
                    )
                  }
                </div>
              )}
              {props.table.columns.map((col, colIdx) => {
                const SortIcon =
                  props.table.sortDirection === 'asc'
                    ? SortUpIcon
                    : SortDownIcon
                const width = props.table.isSelectable
                  ? props.columnSizes[colIdx + 1]
                  : props.columnSizes[colIdx]
                const canSortByCol =
                  props.table.isSortable &&
                  !!col.label &&
                  (col.accessorKey || props.table.cachesRecords)
                return (
                  <div
                    key={colIdx}
                    className={classNames(thClassName, 'px-3', {
                      'cursor-pointer hover:text-gray-800 select-none':
                        canSortByCol,
                    })}
                    onClick={
                      canSortByCol
                        ? () => props.table.handleSort(col.key)
                        : undefined
                    }
                    style={{ width }}
                    role="columnheader"
                  >
                    <span
                      className={classNames('relative', {
                        'pr-3': props.table.isSortable,
                        'text-gray-800':
                          props.table.isSortable &&
                          props.table.sortColumn === col.key,
                      })}
                    >
                      {col.label}
                      {props.table.isSortable &&
                        props.table.sortColumn === col.key && (
                          <SortIcon className="w-2.5 h-2.5 absolute top-[3px] -right-0.5" />
                        )}
                    </span>
                  </div>
                )
              })}
              {props.table.hasRowMenus && (
                // for spacing calculations
                <div className="w-[43px]">&nbsp;</div>
              )}
            </div>
          </div>
        </ScrollSyncPane>
      </div>
    </div>
  )
}

type HorizontalTableRowProps = {
  tableKey?: string
  columns: IVTableColumn[]
  row: IVTableRow
  isDisabled: boolean
  isSelectable: boolean
  onToggleRow: UseTableResult['toggleRow']
  columnSizes: number[]
  fixedWidthColumns?: boolean
  hasRowMenus: boolean
  renderMarkdown?: boolean
  shouldTruncate?: boolean
}

function getHighlightColor(cellValue: IVTableCellValue) {
  if (
    typeof cellValue === 'object' &&
    cellValue &&
    'highlightColor' in cellValue
  ) {
    return cellValue.highlightColor
  }
}

function getConsistentRowHighlight({
  row,
  columns,
}: HorizontalTableRowProps): string | undefined {
  const rowData = row.data as IVTableCells
  const cellColors = columns.map(col => {
    const value = rowData[col.key]
    if (
      value &&
      typeof value === 'object' &&
      'highlightColor' in value &&
      value.highlightColor
    ) {
      return value.highlightColor
    }
  })

  if (
    cellColors.length === columns.length &&
    cellColors.every(color => color === cellColors[0])
  ) {
    return cellColors[0]
  }
}

function HorizontalTableRow(props: HorizontalTableRowProps) {
  const { columns, row } = props

  const rowHighlightColor = getConsistentRowHighlight(props)

  return (
    <div
      role="row"
      className={classNames('text-gray-600 group table-row iv-table-row', {
        'iv-table-row--selected': row.isSelected,
        'hover:bg-gray-50/50 cursor-pointer':
          props.isSelectable && !props.isDisabled,
        'hover:bg-gray-100/50':
          !!rowHighlightColor && props.isSelectable && !props.isDisabled,
      })}
      onClick={evt => {
        if (props.isDisabled || !props.isSelectable) return
        props.onToggleRow(row.key, evt)
      }}
      data-highlight-color={rowHighlightColor}
    >
      {props.isSelectable && (
        <div
          className={classNames(
            'whitespace-nowrap text-gray-900 items-start justify-center sticky left-0 pr-px border-t border-r border-t-gray-100 border-r-gray-200 table-cell bg-white iv-table-cell z-10'
          )}
          style={{ width: CHECKBOX_COLUMN_WIDTH }}
          role="cell"
        >
          <div
            className={classNames(
              'min-h-[41px] absolute left-0 right-0 top-0 bottom-0 h-full w-full flex items-start pt-3 justify-center',
              {
                'before:w-[3px] before:left-0 before:top-0 before:h-full before:bg-primary-500 before:absolute':
                  row.isSelected,
              }
            )}
          >
            <input
              type="checkbox"
              checked={row.isSelected}
              disabled={props.isDisabled}
              // state is managed by the <tr>
              readOnly
            />
          </div>
        </div>
      )}
      {columns.map((col, colIdx) => {
        const cellValue = (row.data as IVTableCells)[col.key]
        return (
          <div
            className="py-2.5 px-3 border-t border-gray-100 table-cell align-top iv-table-cell"
            key={`row-${row.key}-cell-${colIdx}`}
            role="cell"
            data-highlight-color={getHighlightColor(cellValue)}
          >
            <div
              className="whitespace-pre-line hyphenate w-max prose prose-io-table"
              style={{ maxWidth: MAX_CELL_WIDTH, minWidth: MIN_CELL_WIDTH }}
            >
              <RenderValue
                value={cellValue}
                renderMarkdown={props.renderMarkdown}
                shouldTruncate={props.shouldTruncate}
              />
            </div>
          </div>
        )
      })}
      {props.hasRowMenus && row.menu && row.menu.length > 0 && (
        <div className="right-0 sticky !p-0 align-top table-cell bg-white">
          <div className="absolute w-[43px] top-0 bottom-0 right-0 border-t border-l border-l-gray-200 border-t-gray-100"></div>
          <div className="flex justify-end">
            <div className="w-[43px] flex justify-center py-1.5 !px-2">
              <TableRowMenu menu={row.menu} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function rowComparisonFn(
  prev: HorizontalTableRowProps,
  next: HorizontalTableRowProps
) {
  // complete table rerender
  if (prev.tableKey !== next.tableKey) return false
  // selection change
  if (prev.row.isSelected !== next.row.isSelected) return false
  // sort order & pagination change
  if (prev.row.key !== next.row.key) return false
  // column widths
  if (prev.columnSizes.toString() !== next.columnSizes.toString()) return false
  // disabled state change
  if (prev.isDisabled !== next.isDisabled) return false

  return true
}

const MemoizedHorizontalTableRow = React.memo(
  HorizontalTableRow,
  rowComparisonFn
)

const getSizes = (
  orientation: IVTableProps['orientation'],
  node: HTMLDivElement
) => {
  if (orientation === 'vertical') {
    const cells = Array.from(node.querySelectorAll('tr'))

    // getBoundingClientRect returns a more accurate height reading
    return cells.map(cell => cell.getBoundingClientRect().height)
  } else {
    const cells = Array.from(
      node
        .querySelectorAll('div[role="row"]')[0]
        ?.querySelectorAll('div[role="cell"]')
    )

    // getBoundingClientRect returns a more accurate width reading
    return cells.map(cell => cell.getBoundingClientRect().width)
  }
}

function useColumnSizes(props: IVTableProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [sizes, setSizes] = useState<number[]>([])

  const calculate = useCallback(() => {
    if (!ref.current) return

    const calculated = getSizes(props.orientation, ref.current)

    // if the page is resource-constrained, getBoundingClientRect() might return 0 immediately after the items render.
    // If we receive an array of 0's, wait 50s and re-measure.
    if (calculated.every(size => size === 0)) {
      setTimeout(calculate, 50)
    } else {
      setSizes(calculated)
    }
  }, [props.orientation])

  // callback ref: https://reactjs.org/docs/hooks-faq.html#how-can-i-measure-a-dom-node
  const tableRef = useCallback(
    (node: HTMLDivElement) => {
      if (node) {
        ref.current = node
      }

      calculate()
    },
    [calculate]
  )

  useResizeObserver(ref.current, calculate)

  return { tableRef, columnSizes: sizes }
}

function SelectionsNotice({
  label,
  buttonLabel,
  onClick,
}: {
  label: string
  buttonLabel: string
  onClick: () => void
}) {
  return (
    <div className="text-[13px] flex items-start text-gray-500">
      <div className="w-4 mr-2 flex justify-center">
        <InfoIcon className="w-3 h-3 mt-1 rounded-full text-primary-500" />
      </div>
      <p>
        <span className="inline-block mr-1.5">{label}</span>
        <button
          className="text-primary-500 font-medium hover:opacity-70"
          type="button"
          onClick={() => onClick()}
        >
          {buttonLabel}
        </button>
      </p>
    </div>
  )
}

function SelectionCriteria({
  min,
  max,
  selected,
}: {
  min?: number
  max?: number
  selected: number
}) {
  if (min !== undefined && max !== undefined) {
    return (
      <span className={`${selected > max ? 'text-red-600' : ''}`}>
        Selected {numberWithCommas(selected)} of{' '}
        {min === max ? (
          <>{numberWithCommas(min)}</>
        ) : (
          <>
            {numberWithCommas(min)}-{numberWithCommas(max)}
          </>
        )}
      </span>
    )
  }

  if (max !== undefined) {
    return (
      <span className={`${selected > max ? 'text-red-600' : ''}`}>
        Select up to {numberWithCommas(max)}
      </span>
    )
  }

  if (min !== undefined) {
    return <span>Select at least {numberWithCommas(min)}</span>
  }

  return <span>{numberWithCommas(selected)} selected</span>
}

// immediately returns the new value when the input is cleared, otherwise debounces to ${delay}ms.
function useSearchDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      window.clearTimeout(handler)
    }
  }, [value, delay])

  return value === '' ? value : debouncedValue
}

export function TableControls(
  props: IVTableProps & {
    isStuck?: boolean
    location: 'top' | 'bottom'
    customFilters?: React.ReactNode
  }
) {
  const mobileSearchRef = useRef<HTMLInputElement>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useSearchDebounce(searchQuery, 500)

  const { onSearch } = props.table
  useEffect(() => {
    onSearch(debouncedSearchQuery)
  }, [debouncedSearchQuery, onSearch])

  const onClearSearch = () => setSearchQuery('')

  const onToggleSearch = () => {
    setIsSearching(prev => {
      if (prev) {
        return false
      } else {
        setTimeout(() => mobileSearchRef.current?.focus(), 10)
        return true
      }
    })
  }

  return (
    <div
      className={classNames('text-[13px] text-gray-500', {
        'rounded-t-lg': props.isStuck === false && props.location === 'top',
        'border-t border-gray-200': props.location === 'bottom',
      })}
    >
      <div className="flex justify-between p-2">
        <div className="flex items-center">
          {props.location === 'top' && props.table.isFilterable && (
            <button
              className={classNames(
                'sm:hidden flex items-center justify-center mr-2',
                {
                  'text-gray-500': !isSearching,
                  'text-primary-500': isSearching,
                }
              )}
              type="button"
              onClick={onToggleSearch}
            >
              <SearchIcon className="w-5 h-5" />
            </button>
          )}
          {props.table.isFilterable && (
            <div className="relative hidden sm:block mr-2">
              <input
                type="text"
                className="border border-gray-200 rounded text-[13px] px-2 py-0.5 focus:iv-field-focus pr-8 w-[150px]"
                placeholder="Filter"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={preventDefaultInputEnterKey}
              />
              {!!props.table.searchQuery && (
                <button
                  className="absolute top-0 right-0 w-[26px] h-[26px] flex items-center justify-center text-gray-300 hover:text-gray-400"
                  type="button"
                  aria-label="Clear filter"
                  onClick={onClearSearch}
                >
                  <CloseIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
          {props.selectionCriteria && (
            <div className="mr-2">
              <SelectionCriteria {...props.selectionCriteria} />
            </div>
          )}
          {props.customFilters}
          <IVSpinner
            className={classNames('w-3 h-3 text-gray-400', {
              'opacity-0': !props.table.isFetching,
              'opacity-100': props.table.isFetching,
            })}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Pagination {...props.table} />
          {props.table.isDownloadable && (
            <TableDownloader
              table={props.table}
              filename={'filename' in props ? props.filename : undefined}
              orientation={props.orientation}
            />
          )}
        </div>
      </div>
      {props.table.isFilterable && (
        <div
          className={classNames('relative -mx-px z-20', {
            hidden: !isSearching,
            'sm:hidden': isSearching,
          })}
        >
          <input
            type="text"
            className="border border-gray-200 text-sm px-3 py-1.5 focus:iv-field-focus w-full block"
            placeholder="Search"
            ref={mobileSearchRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {!!props.table.searchQuery && (
            <button
              className="absolute top-0 right-0 w-[34px] h-[34px] flex items-center justify-center text-gray-400 hover:text-gray-500"
              type="button"
              onClick={onClearSearch}
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function DesktopTable(props: IVTableProps) {
  const { tableRef, columnSizes } = useColumnSizes(props)

  const TableComponent =
    props.orientation === 'vertical' && props.table.columns
      ? DesktopVerticalTable
      : DesktopHorizontalTable

  const selectedOnPage = props.table.currentPage.filter(
    row => row.isSelected
  ).length
  const totalSelected = props.table.selectedKeys.size

  const isSelectingRange = useDisableSelectionWithShiftKey()

  return (
    <ScrollSync>
      <div>
        <div
          className={classNames('iv-table', props.containerClassName, {
            'select-none': isSelectingRange,
          })}
        >
          <div className="block min-w-full text-sm">
            <TableComponent
              {...props}
              showControls={props.showControls ?? false}
              tableRef={tableRef}
              columnSizes={columnSizes}
            />
          </div>
        </div>
        {selectedOnPage < totalSelected && (
          <div className="py-2">
            <SelectionsNotice
              label={`Selection includes ${pluralizeWithCount(
                totalSelected - selectedOnPage,
                'row',
                'rows',
                { commas: true }
              )} on other
            pages.`}
              buttonLabel="Clear selection"
              onClick={() => props.table.selectNone({ skipWarning: true })}
            />
          </div>
        )}
      </div>
    </ScrollSync>
  )
}
