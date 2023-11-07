import {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
  useLayoutEffect,
} from 'react'
import useResizeObserver from '@react-hook/resize-observer'
import {
  ContextMenu,
  MenuItem,
  ContextMenuTrigger,
} from '@firefox-devtools/react-contextmenu'
import { ZodError } from 'zod'
import classNames from 'classnames'
import ReactDataSheet from 'react-datasheet'
import 'react-datasheet/lib/react-datasheet.css'
import { OutputSchemaBase, RecordValue } from '.'
import IVButton from '~/components/IVButton'
import { castValue, getColumnDefs } from './helpers'
import React from 'react'
import IconAddRowAbove from '~/icons/compiled/AddRowAbove'
import IconDeleteRow from '~/icons/compiled/DeleteRow'
import IconAddRow from '~/icons/compiled/AddRow'
import IconExclamationWarn from '~/icons/compiled/ExclamationWarn'
import IconChevronLeft from '~/icons/compiled/ChevronLeft'
import IconChevronRight from '~/icons/compiled/ChevronRight'

const PAGE_SIZE = 20

type CellValue = RecordValue

export type ColumnDef = {
  type: 'number' | 'text' | 'boolean'
  isRequired: boolean
}

interface Cell extends ReactDataSheet.Cell<Cell, CellValue> {
  value: CellValue
  invalid?: boolean
  colInvalid?: boolean
  rowInvalid?: boolean
  colDef: ColumnDef
}

class DataSheet extends ReactDataSheet<Cell, CellValue> {}

interface ContextState {
  event: MouseEvent
  cell: Cell
  row: number
  col: number
}

const CONTEXT_ICON_CLASS_NAME = 'w-4 h-4 mr-3'

interface SpreadsheetEditorProps {
  id: string
  records: Record<string, RecordValue>[]
  onChange: (newVal: Record<string, RecordValue>[]) => void
  parseError: ZodError | null
  outputSchema: OutputSchemaBase
  disabled?: boolean
}

const SpreadsheetEditor = React.forwardRef<
  HTMLDivElement,
  SpreadsheetEditorProps
>(({ id, records, onChange, parseError, outputSchema, disabled }, ref) => {
  const [page, setPage] = useState(0)
  const contextMenuRef = useRef<typeof ContextMenu | null>(null)
  const [contextState, setContextState] = useState<ContextState | null>(null)
  const contextMenuId = useMemo(() => `__IV_SPREADSHEET_EDITOR_${id}`, [id])
  const recordShape = useMemo(
    () => outputSchema._def.type._def.shape(),
    [outputSchema]
  )
  const columnDefs = useMemo(() => getColumnDefs(outputSchema), [outputSchema])
  const headings = useMemo(() => Object.keys(columnDefs), [columnDefs])

  const [invalidColRows, invalidRows]: [Map<string, Set<number>>, Set<number>] =
    useMemo(() => {
      const map = new Map<string, Set<number>>()
      const rows = new Set<number>()

      if (parseError) {
        for (const issue of parseError.issues) {
          if (issue.path.length === 2) {
            const [rowIndex, colName] = issue.path as [number, string]
            rows.add(rowIndex)

            let rowCells = map.get(colName)
            if (!rowCells) {
              rowCells = new Set()
              map.set(colName, rowCells)
            }
            rowCells.add(rowIndex)
          }
        }
      }

      return [map, rows]
    }, [parseError])

  useEffect(() => {
    if (page * PAGE_SIZE > records.length) {
      setPage(Math.floor(records.length / PAGE_SIZE))
    }
  }, [records, page])

  const recordsToCells = useCallback<
    (records: Record<string, RecordValue>[], rowOffset?: number) => Cell[][]
  >(
    (records, rowOffset = 0) =>
      records.map((record, index) =>
        headings.map(heading => {
          return {
            value: record[heading],
            colDef: columnDefs[heading],
            colInvalid: invalidColRows.has(heading),
            rowInvalid: invalidRows.has(index + rowOffset),
            invalid: invalidColRows.get(heading)?.has(index + rowOffset),
          }
        })
      ),

    [headings, invalidColRows, invalidRows, columnDefs]
  )

  const pageData: Cell[][] = useMemo(() => {
    const start = page * PAGE_SIZE
    const pageRecords = records.slice(start, start + PAGE_SIZE)
    return recordsToCells(pageRecords, start)
  }, [recordsToCells, page, records])

  const handleChange = useCallback(
    (
      changes: ReactDataSheet.CellsChangedArgs<Cell, CellValue>,
      additions?: ReactDataSheet.CellAdditionsArgs<CellValue>
    ) => {
      const data = recordsToCells(records)

      const rowOffset = page * PAGE_SIZE

      const newData = [...data.map(row => [...row])]

      for (const change of changes) {
        const row = change.row + rowOffset
        newData[row][change.col].value = change.value
      }

      if (additions) {
        for (const addition of additions) {
          let row = newData[addition.row + rowOffset]
          if (!row) {
            row = []
            newData[addition.row + rowOffset] = row
          }

          row[addition.col] = {
            value: addition.value,
            colDef: columnDefs[addition.col],
          }
        }
      }

      const newRecords: Record<string, RecordValue>[] = newData.map(row => {
        const record = {}
        headings.forEach((heading, index) => {
          record[heading] = castValue(
            row[index]?.value ?? null,
            recordShape[heading]
          )
        })

        return record
      })

      onChange(newRecords)
    },
    [recordsToCells, records, page, onChange, columnDefs, headings, recordShape]
  )

  const handleRemoveRow = useCallback(
    row => {
      const rowOffset = page * PAGE_SIZE
      const newRecords = [...records]
      newRecords.splice(row + rowOffset, 1)

      onChange(newRecords)
    },
    [onChange, records, page]
  )

  const handleAddRow = useCallback(
    row => {
      const rowOffset = page * PAGE_SIZE
      const newRecord = {}
      for (const heading of headings) {
        newRecord[heading] = castValue(null, recordShape[heading])
      }

      const newRecords = [...records]
      newRecords.splice(row + rowOffset, 0, newRecord)
      onChange(newRecords)
    },
    [onChange, headings, records, recordShape, page]
  )

  const DataTable = useCallback(
    ({
      children,
      className: baseClassName,
    }: ReactDataSheet.SheetRendererProps<Cell, CellValue>) => {
      return (
        <table
          className={classNames(
            baseClassName,
            'divide-y divide-gray-200 w-full text-sm',
            { 'pointer-events-none': disabled }
          )}
        >
          <thead>
            <tr>
              {Object.entries(columnDefs).map(([heading, def]) => (
                <th
                  key={heading}
                  className="bg-blue-50 whitespace-nowrap border text-center py-2 px-2"
                >
                  <strong className="text-gray-800 block leading-5">
                    {heading}
                  </strong>
                  <span className="font-mono font-normal text-xs text-gray-500 block leading-5 lowercase">
                    {`${def.type}${def.isRequired ? '*' : ''}`}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y">{children}</tbody>
        </table>
      )
    },
    [columnDefs, disabled]
  )

  const errorsOnOtherPages = useMemo(() => {
    const messages: string[] = []

    parseError?.issues.forEach(issue => {
      const [rowIndex, colName] = issue.path as [number, string]

      // alias row 0 as row 1, otherwise division is incorrect
      const pageNum = Math.ceil(Math.max(1, rowIndex) / PAGE_SIZE)

      // skip errors on the current page
      if (pageNum === page + 1) return

      if (issue.message.includes('received null')) {
        messages.push(`Missing value for '${colName}' on page ${pageNum}`)
      } else {
        messages.push(`Invalid value for '${colName}' on page ${pageNum}`)
      }
    })

    return messages
  }, [page, parseError?.issues])

  return (
    <div className="text-gray-700 select-none" ref={ref}>
      {records.length > PAGE_SIZE && (
        <Pagination
          page={page}
          setPage={setPage}
          totalRecords={records.length}
        />
      )}

      <div className="flex justify-between items-center text-sm my-2">
        <p>Expected data format:</p>
        <p className="text-gray-500">* indicates required field</p>
      </div>

      <div className="max-w-full overflow-auto">
        <ContextMenuTrigger
          id={contextMenuId}
          disableIfShiftIsPressed
          disable={disabled}
        >
          <DataSheet
            data={pageData}
            onCellsChanged={handleChange}
            valueRenderer={cell =>
              typeof cell.value === 'boolean'
                ? cell.value
                  ? 'true'
                  : 'false'
                : cell.value
            }
            parsePaste={parsePaste}
            sheetRenderer={DataTable}
            rowRenderer={DataRow}
            cellRenderer={props => (
              <DataCell {...props} onAddRow={handleAddRow} />
            )}
            valueViewer={props => (
              <ValueViewer {...props} onChange={handleChange} />
            )}
            dataEditor={DataEditor}
            onContextMenu={(event, cell, row, col) => {
              setContextState({
                event,
                cell,
                row,
                col,
              })
            }}
            onSelect={() => {
              // @ts-ignore: react-contextmenu's types aren't great
              contextMenuRef.current?.handleHide({})
            }}
          />
        </ContextMenuTrigger>
      </div>

      {records.length > PAGE_SIZE && (
        <Pagination
          page={page}
          setPage={setPage}
          totalRecords={records.length}
          disabled={disabled}
        />
      )}

      {errorsOnOtherPages.length > 0 && (
        <div className="text-sm mt-2">
          <p className="flex items-center justify-start">
            <IconExclamationWarn className="w-4 h-4 mr-2 text-red-400" />
            This data contains the following errors:
          </p>
          <ul className="list-disc list-outside ml-10">
            {errorsOnOtherPages.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {/* @ts-ignore: react-contextmenu types aren't quite right */}
      <ContextMenu
        ref={c => {
          contextMenuRef.current = c as unknown as typeof ContextMenu
        }}
        id={contextMenuId}
        onHide={() => {
          setContextState(null)
        }}
      >
        {/* @ts-ignore: react-contextmenu types aren't quite right */}
        <MenuItem
          onClick={() => {
            if (!contextState) return

            console.log(contextState)

            handleAddRow(contextState.row)
          }}
          disabled={!contextState}
        >
          <IconAddRowAbove className={CONTEXT_ICON_CLASS_NAME} />
          Add row above
        </MenuItem>
        {/* @ts-ignore: react-contextmenu types aren't quite right */}
        <MenuItem
          onClick={() => {
            if (!contextState) return

            handleAddRow(contextState.row + 1)
          }}
          disabled={!contextState}
        >
          <IconAddRow className={CONTEXT_ICON_CLASS_NAME} />
          Add row below
        </MenuItem>
        {/* @ts-ignore: react-contextmenu types aren't quite right */}
        <MenuItem
          onClick={() => {
            if (!contextState) return

            handleRemoveRow(contextState.row)
          }}
          disabled={!contextState || records.length === 1}
        >
          <IconDeleteRow className={CONTEXT_ICON_CLASS_NAME} />
          Delete row
        </MenuItem>
      </ContextMenu>
    </div>
  )
})

SpreadsheetEditor.displayName = 'SpreadsheetEditor'
export default SpreadsheetEditor

interface PaginationProps {
  page: number
  setPage: (page: number) => void
  totalRecords: number
  disabled?: boolean
}

function Pagination({
  page,
  setPage,
  totalRecords,
  disabled,
}: PaginationProps) {
  const maxPage = useMemo(
    () => Math.ceil(totalRecords / PAGE_SIZE) - 1,
    [totalRecords]
  )

  return (
    <div className="flex flex-wrap justify-between items-center mt-2">
      <div className="text-sm">
        Page {page + 1} of {maxPage + 1}
      </div>
      <div className="flex space-x-2 items-start flex-none">
        <IVButton
          theme="secondary"
          label={
            <span className="flex items-center gap-2">
              <IconChevronLeft className="w-4 h-4 -ml-1 -mr-1.5" />
              Prev
            </span>
          }
          condensed
          disabled={page === 0 || disabled}
          onClick={() => {
            if (page === 0) return
            setPage(page - 1)
          }}
        />
        <IVButton
          theme="secondary"
          label={
            <span className="flex items-center gap-2">
              Next
              <IconChevronRight className="w-4 h-4 -mr-1 -ml-1.5" />
            </span>
          }
          condensed
          disabled={page === maxPage || disabled}
          onClick={() => {
            if (page >= maxPage) return
            setPage(page + 1)
          }}
        />
      </div>
    </div>
  )
}

function parsePaste(pastedString: string): string[][] {
  // https://github.com/nadbm/react-datasheet/issues/309#issuecomment-1023031077
  return pastedString
    .trim()
    .split(/\r\n|\n|\r/)
    .map(row => row.split('\t'))
}

function DataRow({
  children,
}: ReactDataSheet.RowRendererProps<Cell, CellValue>) {
  return <tr>{children}</tr>
}

function DataCell({
  cell,
  children,
  style,
  row,
  col,
  onMouseDown,
  onMouseOver,
  onDoubleClick,
  onContextMenu,
  onAddRow,
  selected,
  editing,
}: ReactDataSheet.CellRendererProps<Cell, CellValue> & {
  onAddRow: (row: number) => void
}) {
  const ref = useRef<HTMLTableCellElement>(null)

  const customKeydownListener = useCallback(
    (event: KeyboardEvent) => {
      // must listen to metaKey, which react-datasheet uses to block going into edit mode.
      // with event.shiftKey we add a new row but it also initiates editing the current cell.
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        // Add new rows with Ctrl/Cmd + Return
        onAddRow(row + 1)
      }
    },
    [onAddRow, row]
  )

  useEffect(() => {
    if (selected) {
      window.addEventListener('keydown', customKeydownListener)
    } else {
      window.removeEventListener('keydown', customKeydownListener)
    }

    return () => {
      window.removeEventListener('keydown', customKeydownListener)
    }
  }, [customKeydownListener, selected])

  useEffect(() => {
    if (!selected || cell.colDef.type !== 'boolean') return

    // put boolean cells into edit mode immediately upon selection
    ref.current?.dispatchEvent(
      new MouseEvent('dblclick', {
        view: window,
        bubbles: true,
        cancelable: true,
      })
    )
  }, [selected, cell.colDef.type])

  return (
    <td
      ref={ref}
      className={classNames('whitespace-nowrap relative text-gray-700 border', {
        'border-double border-blue-500 bg-blue-50': selected || editing,
        'bg-amber-50 text-amber-600': !selected && !editing && cell.invalid,
        'border-solid border-gray-200': !selected && !editing,
        'overflow-hidden': !editing,
        'bg-white z-10': editing,
      })}
      style={style ?? undefined}
      onMouseDown={onMouseDown}
      onMouseOver={onMouseOver}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      data-row={row}
      data-col={col}
    >
      <div className="flex leading-4 px-3">{children}</div>
      {cell.component}
    </td>
  )
}

function ValueViewer({
  value,
  cell,
  row,
  col,
  onChange,
}: ReactDataSheet.ValueViewerProps<Cell, CellValue> & {
  // needed to allow editing boolean cells without being in edit mode
  onChange: (changes: ReactDataSheet.CellsChangedArgs<Cell, CellValue>) => void
}) {
  if (cell.colDef.type === 'boolean')
    return (
      <span className="w-full flex items-center justify-center">
        <label className="w-9 flex items-center justify-center cursor-pointer">
          <input
            type="checkbox"
            className="form-input no-ring"
            onFocus={e => e.target.blur()}
            onMouseDown={() => {
              onChange([
                { cell, row, col, value: value === 'true' ? false : true },
              ])
            }}
            defaultChecked={value === 'true'}
          />
        </label>
      </span>
    )

  return (
    <span className="leading-4 block select-none min-w-px py-2">
      {value === null || value === '' ? <>&nbsp;</> : value}
    </span>
  )
}

function DataEditor({
  cell,
  value,
  onChange,
  onKeyDown,
  onRevert,
  onCommit,
}: ReactDataSheet.DataEditorProps<Cell, CellValue>) {
  const spanRef = useRef<HTMLSpanElement>(null)
  const cbRef = useRef<HTMLInputElement>(null)
  const size = useSize(spanRef)
  const handleChange = useCallback(
    event => {
      onChange(event.target.value)
    },
    [onChange]
  )

  // @ts-ignore - despite typings, `value` may be a boolean or a string
  const typedValue = value === 'true' || value === true

  // for when the cell is selected but nothing is focused, e.g. checkboxes.
  const customKeydownListener = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowUp':
        case 'ArrowDown':
          // jump out of edit mode in boolean cells using arrow keys
          if (cell.colDef.type === 'boolean') {
            // @ts-ignore - expects a keyboard event but we're attaching to window.
            // also purposefully committing `value` here, not the opposite of `value`.
            onCommit(value, event)
          }
          break
        default:
      }

      // must listen to metaKey, which react-datasheet uses to block going into edit mode.
      // with event.shiftKey we add a new row but it also initiates editing the current cell.
      if (
        cell.colDef.type === 'boolean' &&
        !event.metaKey &&
        !event.ctrlKey &&
        (event.key === 'Enter' || event.code === 'Space')
      ) {
        onChange(!typedValue)
        event.preventDefault()
      }
    },
    [cell.colDef.type, onCommit, value, onChange, typedValue]
  )

  useEffect(() => {
    window.addEventListener('keydown', customKeydownListener)

    return () => {
      window.removeEventListener('keydown', customKeydownListener)
    }
  }, [customKeydownListener])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowUp':
        case 'ArrowDown':
          // jump out of edit mode in boolean cells using arrow keys
          if (cell.colDef.type === 'boolean') {
            onCommit(value, event)
            onKeyDown(event)
          }
          break

        case 'Esc':
        case 'Escape':
          onRevert()
          break
        case 'Enter':
          // ignore ctrl/meta + return, which creates a new row
          if (event.metaKey || event.ctrlKey) break

          if (cell.colDef.type === 'boolean') {
            // use enter key to make & commit changes in boolean cells.
            // exclude 2nd event param to keep focus on the selected cell.
            onChange(!typedValue)
            onCommit(!typedValue)
          } else {
            onCommit(value, event)
          }
          break
        default:
          onKeyDown(event)
      }
    },
    [
      onCommit,
      value,
      onKeyDown,
      onRevert,
      cell.colDef.type,
      onChange,
      typedValue,
    ]
  )

  return (
    <>
      {cell.colDef.type === 'boolean' ? (
        <span className="w-full flex items-center justify-center" ref={spanRef}>
          <label className="w-9 flex items-center justify-center cursor-pointer">
            <input
              type="checkbox"
              className="form-input no-ring"
              onFocus={e => e.target.blur()}
              onChange={e => onChange(e.target.checked)}
              onKeyDown={handleKeyDown}
              checked={typedValue}
              ref={cbRef}
            />
          </label>
        </span>
      ) : (
        <>
          <span
            ref={spanRef}
            className="px-3 py-2 absolute left-0 top-0 -translate-x-96 -translate-y-96 whitespace-nowrap"
          >
            {value}
          </span>
          <input
            type="text"
            className="flex-1 text-gray-900 focus:outline-none bg-blue-50 py-2 leading-4 -mt-px"
            value={value?.toString()}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              width: size?.width ?? 0 + 12,
            }}
          />
        </>
      )}
    </>
  )
}

function useSize(target) {
  const [size, setSize] = useState<DOMRectReadOnly | null>(null)

  useLayoutEffect(() => {
    setSize(target.current.getBoundingClientRect())
  }, [target])

  useResizeObserver(target, entry => {
    setSize(entry.target.getBoundingClientRect())
  })

  return size
}
