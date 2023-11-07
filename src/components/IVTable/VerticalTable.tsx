import { IVTableProps } from '.'
import React from 'react'
import { TableControls } from './DesktopTable'
import classNames from 'classnames'
import TableRowMenu from './TableRowMenu'
import RenderValue from '../RenderValue'

type OrientationTableProps = IVTableProps & {
  tableRef: (node: HTMLDivElement) => void
  columnSizes: number[]
}

export default function DesktopVerticalTable(props: OrientationTableProps) {
  return (
    <div>
      {props.showControls && <TableControls location="top" {...props} />}
      {props.table.currentPage.length === 0 && !!props.table.searchQuery && (
        <div className="text-center py-12 px-4 text-gray-500 border-y border-gray-100">
          No records found matching '{props.table.searchQuery}'
        </div>
      )}
      {props.table.currentPage.length > 0 && (
        <div className="flex border-y border-gray-100">
          <div className="flex-none border-r border-gray-200 bg-[#f9fafb]">
            {props.table.isSelectable && (
              <div className="iv-table__cell px-3 py-1.5 border-t-0">
                &nbsp;
              </div>
            )}
            {props.table.columns.map((col, colIdx) => (
              <div
                key={colIdx}
                role="rowheader"
                className={classNames(
                  'px-3 py-1.5 whitespace-nowrap text-gray-500 truncate font-medium border-t border-gray-100 first:border-0'
                )}
                style={{ height: Math.floor(props.columnSizes[colIdx]) }}
              >
                {col.label}
              </div>
            ))}
            {props.table.hasRowMenus && (
              <div className="iv-table__cell px-3 py-1.5 border-t border-gray-100">
                &nbsp;
              </div>
            )}
          </div>
          <div className="flex-1 overflow-x-auto" ref={props.tableRef}>
            <table data-pw-search={props.table.searchQuery}>
              <tbody>
                {props.table.isSelectable && (
                  <tr>
                    {props.table.currentPage.map(row => (
                      <td
                        key={row.key}
                        className="p-0 whitespace-nowrap text-gray-900 text-center border-t border-gray-100 first:border-0"
                      >
                        <label
                          htmlFor={`row-${row.key}-cb`}
                          className={classNames(
                            'block w-full text-center py-1.5',
                            {
                              'cursor-pointer hover:bg-gray-50':
                                !props.table.isDisabled,
                            }
                          )}
                        >
                          <input
                            type="checkbox"
                            id={`row-${row.key}-cb`}
                            checked={row.isSelected}
                            disabled={props.table.isDisabled}
                            onClick={() => {
                              if (props.table.isDisabled) return
                              props.table.toggleRow(row.key)
                            }}
                          />
                        </label>
                      </td>
                    ))}
                  </tr>
                )}
                {props.table.columns.map(col => {
                  return (
                    <tr key={col.key} className="text-gray-600">
                      {props.table.currentPage.map(row => {
                        return (
                          <td
                            className="pl-3 pr-1 py-1.5 whitespace-nowrap w-1 truncate border-t border-gray-100 iv-table__cell"
                            key={row.key}
                          >
                            <RenderValue value={row.data[col.key]} />
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
                {props.table.hasRowMenus && (
                  <tr>
                    {props.table.currentPage.map(row => (
                      <td
                        key={row.key}
                        className="py-1 whitespace-nowrap text-gray-900 text-center border-t border-gray-100"
                      >
                        {row.menu && <TableRowMenu menu={row.menu} />}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {props.showControls && <TableControls location="bottom" {...props} />}
    </div>
  )
}
