import { useCallback, useEffect, useState } from 'react'
import download from 'downloadjs'
import { unparse } from 'papaparse'
import stringify from '~/utils/stringify'
import { IVTableColumn, IVTableRow, UseTableResult } from './useTable'
import DropdownMenu from '~/components/DropdownMenu'
import MoreIcon from '~/icons/compiled/More'

function createRowForExport(row: IVTableRow, col: IVTableColumn) {
  const cell =
    row.rawData[col.key] ?? (col.label ? row.rawData[col.label] : null)
  if (cell === null) {
    return ''
  } else if (typeof cell === 'object' && 'label' in cell) {
    return cell['label']
  } else if (col.formatter) {
    return col.formatter(cell)
  } else {
    return stringify(cell)
  }
}

export default function TableDownloader({
  table,
  filename = 'download',
  orientation,
  disabled,
}: {
  table: UseTableResult
  filename?: string
  orientation?: 'horizontal' | 'vertical'
  disabled?: boolean
}) {
  const {
    columns,
    data,
    totalRecords,
    onRequestDownload,
    isRequestingDownload,
    isFullTableInMemory,
  } = table

  const [format, setFormat] = useState<'csv' | 'xlsx' | null>(null)

  const getData = useCallback((): string[][] => {
    if (orientation === 'vertical') {
      return columns.map(col => [
        typeof col === 'string' ? col : col.label ?? col.key,
        ...data.map(row => createRowForExport(row, col)),
      ])
    }

    return [
      columns.map(col =>
        typeof col === 'string' ? col : col.label ?? col.key
      ),
      ...data.map(row => columns.map(col => createRowForExport(row, col))),
    ]
  }, [columns, data, orientation])

  const handleDownloadCsv = useCallback(() => {
    if (!isFullTableInMemory) return

    const csv = unparse(getData())
    download(csv, `${filename}.csv`, 'text/csv')
  }, [getData, filename, isFullTableInMemory])

  const handleDownloadXlsx = useCallback(async () => {
    if (!isFullTableInMemory) return

    const { writeFile, utils } = await import('xlsx')

    const wb = utils.book_new()
    const ws = utils.aoa_to_sheet(getData())
    utils.book_append_sheet(wb, ws)

    writeFile(wb, `${filename}.xlsx`)
  }, [getData, filename, isFullTableInMemory])

  useEffect(() => {
    if (!format) return

    if (!isFullTableInMemory) {
      if (!isRequestingDownload) onRequestDownload()
      return
    }

    setFormat(null)

    if (format === 'csv') handleDownloadCsv()
    if (format === 'xlsx') handleDownloadXlsx()
  }, [
    format,
    handleDownloadCsv,
    handleDownloadXlsx,
    isFullTableInMemory,
    isRequestingDownload,
    onRequestDownload,
  ])

  const isLoading = (fmt: any) => {
    return format === fmt && !isFullTableInMemory
  }

  const remainingPercent = totalRecords
    ? Math.round((data.length / totalRecords) * 100)
    : undefined
  const remainingDisplay = remainingPercent ? ` (${remainingPercent}%)` : ''

  return (
    <div className="flex flex-wrap gap-2">
      <DropdownMenu
        title="Open table options"
        disabled={disabled}
        buttonClassName="focus:outline-none"
        menuClassName="min-w-[180px]"
        options={[
          {
            label: isLoading('csv')
              ? `Please wait...${remainingDisplay}`
              : 'Download as CSV',
            onClick: () => setFormat('csv'),
            disabled: isLoading('csv'),
          },
          {
            label: isLoading('xlsx')
              ? `Please wait...${remainingDisplay}`
              : 'Download as Excel',
            onClick: () => setFormat('xlsx'),
            disabled: isLoading('xlsx'),
          },
        ]}
      >
        <span className="px-1 py-1 border border-transparent hover:border-gray-300 rounded-md block">
          <span className="sr-only">Table options</span>
          <MoreIcon className="w-4 h-4" aria-hidden="true" />
        </span>
      </DropdownMenu>
    </div>
  )
}
