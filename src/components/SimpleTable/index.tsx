import classNames from 'classnames'
import RenderValue from '~/components/RenderValue'
import { UseTableResult } from '~/components/IVTable/useTable'
import { TableControls } from '~/components/IVTable/DesktopTable'

export interface SimpleTable {
  table: UseTableResult
  columnClassNames?: string[]
  showControls?: boolean
  customFilters?: React.ReactNode
  emptyState?: React.ReactNode
}

export default function SimpleTable({
  table,
  columnClassNames = [],
  showControls = true,
  customFilters,
  emptyState,
}: SimpleTable) {
  return (
    <div>
      {showControls && (
        <TableControls
          location="top"
          table={table}
          customFilters={customFilters}
        />
      )}
      {emptyState && !table.data.length ? (
        emptyState
      ) : (
        <>
          <table className="table w-full text-sm text-gray-500">
            <thead>
              <tr>
                {table.columns.map(header => (
                  <th
                    key={header.key}
                    className="text-left text-gray-800 font-medium px-3 py-2"
                  >
                    {header.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="border-y border-gray-200">
              {table.currentPage.map(row => (
                <tr
                  key={row.key}
                  className="border-t border-gray-100 first:border-0"
                >
                  {Object.keys(row.data).map((cell, idx) => (
                    <td
                      key={[row.key, idx].join('-')}
                      className={classNames(
                        'px-3 py-2.5',
                        columnClassNames[idx]
                      )}
                    >
                      <RenderValue value={row.data[cell]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {showControls && <TableControls location="bottom" table={table} />}
        </>
      )}
    </div>
  )
}
