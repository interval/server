import { extractColumns } from '@interval/sdk/dist/utils/spreadsheet'
import Papa from 'papaparse'
import { z } from 'zod'
import { OutputSchemaBase, RecordValue } from '.'
import { RCTResponderProps } from '~/components/RenderIOCall'
import { ColumnDef } from './SpreadsheetEditor'

export function castValue(
  val: RecordValue,
  cellSchema?: z.ZodTypeAny
): RecordValue {
  // Treat empty cells as `false` for non-nullable boolean fields
  if (cellSchema?._def.typeName === 'ZodBoolean') {
    return Boolean(val)
  }

  if (val == null || val === '') {
    return null
  }

  const numVal = Number(val)

  if (cellSchema) {
    const typeName: z.ZodFirstPartyTypeKind =
      cellSchema._def.typeName === 'ZodNullable'
        ? cellSchema._def.innerType._def.typeName
        : cellSchema._def.typeName

    switch (typeName) {
      case 'ZodBoolean':
        return Boolean(val)
      case 'ZodNumber':
        if (!Number.isNaN(numVal)) {
          return numVal
        }
        return val
    }

    return val
  }

  if (!Number.isNaN(numVal)) {
    return numVal
  } else if (val === 'Yes') {
    return true
  } else if (val === 'No') {
    return false
  } else {
    return val
  }
}

export function getHeaderRow(
  columns: RCTResponderProps<'INPUT_SPREADSHEET'>['columns']
) {
  const outputSchema = extractColumns(columns)
  const shape = outputSchema._def.type._def.shape()
  const headings = Object.keys(shape)
  const record = {}
  for (const heading of headings) {
    record[heading] = castValue(null, shape[heading])
  }
  return [record]
}

export function parseCSV(input: File | string) {
  return new Promise<Papa.ParseStepResult<any>>(resolve => {
    Papa.parse(input, {
      header: true,
      dynamicTyping: true,
      worker: true,
      skipEmptyLines: true,
      complete(results: Papa.ParseStepResult<any>) {
        console.debug('Parsed results:', results)
        resolve(results)
      },
    })
  })
}

export function getColumnDefs(
  outputSchema: OutputSchemaBase
): Record<string, ColumnDef> {
  const shape = outputSchema._def.type._def.shape()
  const defs = {}

  for (const [name, colSchema] of Object.entries(shape) as [string, any]) {
    if (colSchema._def.typeName === 'ZodNullable') {
      defs[name] = {
        type: zodTypeToString(
          colSchema._def.innerType._def.typeName
        ).toLowerCase(),
        isRequired: false,
      }
    } else {
      defs[name] = {
        type: zodTypeToString(colSchema._def.typeName).toLowerCase(),
        isRequired: true,
      }
    }
  }

  return defs
}

export function zodTypeToString(zodType: z.ZodFirstPartyTypeKind): string {
  // TODO: Improve this
  switch (zodType) {
    case 'ZodString':
      return 'Text'
    default:
      return zodType.replace('Zod', '')
  }
}

export function generateBlankRow(outputSchema: OutputSchemaBase) {
  const shape = outputSchema._def.type._def.shape()
  const headings = Object.keys(shape)
  const record = {}
  for (const heading of headings) {
    record[heading] = castValue(null, shape[heading])
  }
  return [record]
}
