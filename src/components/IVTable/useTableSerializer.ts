import { z } from 'zod'
import {
  internalTableColumn,
  internalTableRow,
} from '@interval/sdk/dist/ioSchema'
import { useMemo } from 'react'
import { IVTableCells, IVTableCellValueObject, IVTableRow } from './useTable'
import stringify from '~/utils/stringify'
import useRenderContext from '~/components/RenderContext'

/**
 * Serializes data from IO table functions into an IVTable-friendly format.
 */
export default function useTableSerializer(props: {
  data: z.infer<typeof internalTableRow>[]
  columns?: z.infer<typeof internalTableColumn>[]
}) {
  const { getActionUrl } = useRenderContext()

  const headings = useMemo(() => {
    const keys = new Set(
      props.data.flatMap(record => Object.keys(record.data))
    ).values()
    return Array.from(keys).map(key => ({
      key,
      label: key,
      accessorKey: key,
    }))
  }, [props.data])

  const columns = useMemo(() => {
    if (props.columns) {
      return props.columns.map((col, index) => ({
        key: col.accessorKey ?? index.toString(),
        accessorKey: col.accessorKey,
        label: col.label,
      }))
    } else {
      return headings
    }
  }, [headings, props.columns])

  const data = useMemo<IVTableRow[]>(() => {
    return props.data.map(row => {
      const data: IVTableCells = {}

      const searchValues: string[] = []

      for (const heading of columns) {
        const cell = row.data[heading.key]
        if (cell == null) {
          data[heading.key] = '-'
        } else if (
          typeof cell === 'object' &&
          !Array.isArray(cell) &&
          !(cell instanceof Date)
        ) {
          const { href, route, action, ...rest } = cell
          const cellObj: IVTableCellValueObject = rest

          if (!cellObj.url && href && typeof href === 'string') {
            cellObj.url = href
          }

          const slug = route ?? action

          if (!cellObj.url && slug && typeof slug === 'string') {
            cellObj.url = getActionUrl({
              ...cell,
              slug,
            })
            cellObj.isInternalActionUrl = true
          }
          data[heading.key] = cellObj
          if (cellObj.label) {
            searchValues.push(
              cellObj.label instanceof Date
                ? cellObj.label.toLocaleString()
                : cellObj.label.toString()
            )
          }
        } else {
          data[heading.key] = stringify(cell)
          searchValues.push(stringify(cell))
        }
      }

      return {
        key: row.key,
        data,
        rawData: row.data,
        filterValue: searchValues.join(' ').toLowerCase(),
        menu: row.menu?.map(menuItem => {
          const params = 'params' in menuItem ? menuItem.params : undefined

          if ('action' in menuItem && !('route' in menuItem)) {
            const { action, ...rest } = menuItem

            return {
              ...rest,
              path: getActionUrl({ slug: action, params }),
            }
          }

          if ('route' in menuItem) {
            const { route, ...rest } = menuItem

            return {
              ...rest,
              path: getActionUrl({ slug: String(route), params }),
            }
          }

          return menuItem
        }),
      }
    })
  }, [columns, getActionUrl, props.data])

  return { data, columns }
}
