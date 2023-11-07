import { expect, Page, Locator } from '@playwright/test'
import * as Papa from 'papaparse'
import { Readable } from 'stream'
import { atLeastVersion } from '../_setup'
import { dateTimeFormatter } from '~/utils/formatters'
import { deserializeDate } from '~/utils/validate'

interface ColumnDef {
  label: string
  accessorKey?: string
  renderCell?: (row: any) => any
}

/**
 * Renames `renderCell` function to `render` for older SDKs
 */
export function renameRenderer(
  columns: (ColumnDef & { renderCell: NonNullable<ColumnDef['renderCell']> })[]
): { label: string; render: (row: any) => any }[] {
  return columns.map(col => ({ label: col.label, render: col.renderCell }))
}

export function applyStringColumns<T>(data: T[], columns: string[]) {
  return data.map(r => {
    const ret = {}

    for (const col of columns) {
      ret[col] = r[col]
    }

    return ret
  })
}

export function applyColumns<T>(data: T[], columns: ColumnDef[]) {
  return data.map(r => {
    const ret = {}

    for (const col of columns) {
      ret[col.label] =
        col.renderCell?.(r) ?? (col.accessorKey ? r[col.accessorKey] : null)
    }

    return ret
  })
}

async function checkCell(el: Locator, val: any) {
  let isLink = false
  if (val && typeof val === 'object' && !(val instanceof Date)) {
    isLink = !!val.url || !!val.href

    if (atLeastVersion('0.29.0')) {
      if (val.image) {
        if (val.image.url) {
          await expect(el.locator(`img[src="${val.image.url}"]`)).toBeVisible()
        } else if (val.image.buffer) {
          const img = el.locator('img')
          await expect(img.getAttribute('src')).toMatch(/^data:/)
        }
      }
    }

    val = val.label
  }

  if (val) {
    if (isLink) {
      el = el.locator('a')
    }

    const deserialized = deserializeDate(val)
    if (deserialized) {
      val = deserialized
    }

    if (val instanceof Date) {
      val = dateTimeFormatter.format(val)
    }

    await expect(el).toContainText(val.toString())
  }
}

export async function checkTable(
  table: Locator,
  data: any,
  {
    orientation = 'horizontal',
    numRecordsToCheck = data.length,
  }: {
    orientation?: 'vertical' | 'horizontal'
    numRecordsToCheck?: number
  } = {}
) {
  const PAGE_SIZE = orientation === 'vertical' ? 5 : 20

  if (orientation === 'vertical') {
    await table.locator('[role="rowheader"]:has-text("index")').click()
  } else {
    await table.locator('[role="columnheader"]:has-text("index")').click()
  }

  const headings = new Set(data.flatMap(r => Object.keys(r)))
  const tableHeadings = (
    await table
      .locator(
        orientation === 'vertical'
          ? '[role="rowheader"]'
          : '[role="columnheader"]'
      )
      .allTextContents()
  ).filter(t => !!t)

  for (const heading of tableHeadings) {
    expect(headings.has(heading)).toBe(true)
  }

  for (let i = 0; i < numRecordsToCheck; i++) {
    if (i > 0 && i % PAGE_SIZE === 0) {
      await table
        .locator('[data-pw="pagination"] [aria-label="Next page"]')
        .first()
        .click()
    }
    const record = data[i]
    if (orientation === 'vertical') {
      for (let j = 0; j < tableHeadings.length; j++) {
        const heading = tableHeadings[j]
        const tr = table.locator('tr').nth(j)
        await checkCell(tr.locator('td').nth(i % PAGE_SIZE), record[heading])
      }
    } else {
      const tr = table.locator('[role="row"]').nth(i % PAGE_SIZE)
      for (let j = 0; j < tableHeadings.length; j++) {
        const heading = tableHeadings[j]
        await checkCell(tr.locator('[role="cell"]').nth(j), record[heading])
      }
    }
  }

  // 1st column of test data is `index`, 2nd column is a unique value
  const searchVal = String(Object.values(data[0])[1])

  // Filter with results
  await table.locator('input[placeholder="Filter"]').first().type(searchVal)

  await expect(table.locator(`[data-pw-search="${searchVal}"]`)).toBeVisible()

  if (orientation === 'horizontal') {
    expect(await table.locator('[role="row"]').count()).toBe(1)
  } else if (orientation === 'vertical') {
    expect(await table.locator('tbody tr:nth-child(1) td').count()).toBe(1)
  }

  // Filter with no results
  await table.locator('input[placeholder="Filter"]').first().type('abcd')
  await expect(
    table.locator(`text="No records found matching '${searchVal}abcd'"`)
  ).toBeVisible()

  await table.locator('button[aria-label="Clear filter"]').first().click()
  await expect(table.locator(`[data-pw-search=""]`)).toBeVisible()

  if (orientation === 'horizontal') {
    expect(await table.locator('[role="row"]').count()).toBe(20)
  } else if (orientation === 'vertical') {
    expect(
      await table.locator('tbody tr:nth-child(1) td').count()
    ).toBeGreaterThan(1)
  }
}

export async function checkTableEdges(table: Locator, data: any) {
  const headings = new Set(data.flatMap(r => Object.keys(r)))
  const tableHeadings = await table
    .locator('[role="columnheader"]')
    .allTextContents()

  for (const heading of tableHeadings) {
    expect(headings.has(heading)).toBe(true)
  }

  {
    await table.locator('[role="columnheader"]:has-text("index")').click()
    const tr = table.locator('[role="row"]').nth(0)
    for (let j = 0; j < tableHeadings.length; j++) {
      const heading = tableHeadings[j]
      await checkCell(tr.locator('[role="cell"]').nth(j), data[0][heading])
    }
  }
  {
    await table.locator('[role="columnheader"]:has-text("index")').click()
    const tr = table.locator('[role="row"]').nth(0)
    for (let j = 0; j < tableHeadings.length; j++) {
      const heading = tableHeadings[j]
      await checkCell(
        tr.locator('[role="cell"]').nth(j),
        data[data.length - 1][heading]
      )
    }
  }
}

async function resolveDownloadStream(readable: Readable): Promise<string> {
  return new Promise(resolve => {
    const chunks: string[] = []
    readable.on('data', chunk => {
      chunks.push(chunk)
    })

    readable.on('end', () => {
      resolve(chunks.join(''))
    })
  })
}

export async function testDownload(
  page: Page,
  table: Locator,
  data: any,
  mode?: 'simple' | 'full'
) {
  await table.locator('button', { hasText: 'Table options' }).first().click()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    table.locator('text=Download as CSV').first().click(),
  ])

  const stream = await download.createReadStream()
  if (!stream) {
    throw new Error('No stream for download?')
  }
  const csv = await resolveDownloadStream(stream)
  const parsed = Papa.parse(csv, {
    header: true,
    dynamicTyping: true,
  })

  const headings = Object.keys(parsed.data[0] as object)

  if (mode === 'simple') {
    expect(parsed.data.length).toEqual(data.length)
    return
  }

  const dataLabels = data.map(record => {
    const ret = {}

    for (const [k, v] of Object.entries(record)) {
      ret[k] =
        v && typeof v === 'object' && 'label' in v ? v['label'] : v ?? null

      // Re-parsing the CSV in tests casts numeric strings to numbers and creates nulls for missing data, not a real problem
      if (typeof ret[k] === 'string') {
        const num = Number(ret[k])
        if (!Number.isNaN(num)) {
          ret[k] = num
        }
      }

      for (const heading of headings) {
        if (!(heading in ret)) {
          ret[heading] = null
        }
      }
    }

    return ret
  })

  expect(parsed.data).toEqual(dataLabels)
}
