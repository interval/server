import React, { FormEvent, useMemo, useState } from 'react'
import IVDialog, { useDialogState } from '~/components/IVDialog'
import { ParsedImport, RecordValue } from '../'
import IVCheckbox from '~/components/IVCheckbox'
import IVButton from '~/components/IVButton'
import { RCTResponderProps } from '~/components/RenderIOCall'
import { extractColumns } from '@interval/sdk/dist/utils/spreadsheet'
import { castValue } from '../helpers'
import IconRightArrow from '~/icons/compiled/RightArrow'

interface ImporterProps {
  dialog: ReturnType<typeof useDialogState>
  onClose: (result: Record<string, RecordValue>[] | null) => void
  input: ParsedImport | null
  columns: RCTResponderProps<'INPUT_SPREADSHEET'>['columns']
}

export default function Importer(props: ImporterProps) {
  const outputSchema = useMemo(
    () => extractColumns(props.columns),
    [props.columns]
  )

  const recordShape = useMemo(
    () => outputSchema._def.type._def.shape(),
    [outputSchema]
  )

  const columnNames = useMemo(
    () =>
      Object.keys(outputSchema._def.type._def.shape()).map(k => k.toString()),
    [outputSchema]
  )

  const [columnMappings, setColumnMappings] = useState<(number | null)[]>(
    new Array(columnNames.length).fill(0).map((v, i) => i)
  )

  const inputColumns = (props.input?.meta.fields || []).map((label, value) => ({
    label,
    value,
  }))

  const outputColumns = columnNames.map((label, value) => ({
    label,
    value,
  }))

  const handleColumnMappingChange = (
    outputIndex: number,
    index: string | number | null
  ) => {
    setColumnMappings(prev => {
      const newMappings = [...prev]
      newMappings[outputIndex] = index === null ? null : Number(index)
      return newMappings
    })
  }

  const processImport = (event?: Event | FormEvent) => {
    if (event) event.preventDefault()

    if (!props.input) return

    const records = props.input.data as Record<string, RecordValue>[]

    const importResult = records.map((record: Record<string, RecordValue>) => {
      const newRecord: Record<string, RecordValue> = {}
      const values = Object.values(record)
      for (let i = 0; i < columnNames.length; i++) {
        const colIdx = columnMappings[i]
        const colName = columnNames[i]
        const value = colIdx === null ? null : values[colIdx]
        newRecord[colName] = castValue(value, recordShape[colName])
      }
      return newRecord
    })

    console.debug('Import result:', importResult)

    props.onClose(importResult)
  }

  return (
    <IVDialog title="Import CSV" dialog={props.dialog} widthClassName="w-full">
      <form onSubmit={processImport}>
        <div className="grid grid-cols-[1fr,50px,1fr,40px] items-center gap-2 text-gray-700 text-sm">
          <h4 className="text-gray-800 font-medium">Imported fields</h4>
          <span>&nbsp;</span>
          <h4 className="text-gray-800 font-medium">Expected fields</h4>
          <h4 className="text-gray-800 font-medium">Skip?</h4>

          {outputColumns.map((fieldName, outputIndex) => (
            <React.Fragment key={outputIndex}>
              <div>
                <select
                  className="form-select block w-full"
                  key={outputIndex}
                  onChange={e =>
                    handleColumnMappingChange(outputIndex, e.target.value)
                  }
                  value={String(columnMappings[outputIndex] || '')}
                  disabled={columnMappings[outputIndex] === null}
                  data-testid={`col-select-${outputIndex}`}
                >
                  {columnMappings[outputIndex] === null && (
                    <option value="">--</option>
                  )}
                  {inputColumns.map(({ label, value }) => (
                    <option key={value} value={String(value)}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <IconRightArrow className="text-gray-500 w-4 h-4 block mx-auto mt-1" />
              </div>
              <div className="pr-2">
                <strong
                  className={
                    columnMappings[outputIndex] === null ? 'opacity-50' : ''
                  }
                >
                  {fieldName.label}
                </strong>
              </div>
              <div>
                <IVCheckbox
                  id={`skip-${outputIndex}`}
                  checked={columnMappings[outputIndex] === null}
                  onChange={e =>
                    handleColumnMappingChange(
                      outputIndex,
                      e.target.checked ? null : outputIndex
                    )
                  }
                />
              </div>
            </React.Fragment>
          ))}
        </div>

        <div className="border-t border-gray-200 pt-4 mt-6 flex items-start justify-start space-x-2">
          <IVButton
            type="submit"
            theme="primary"
            onClick={processImport}
            label="Import"
            tabIndex={0}
          />
          <IVButton
            theme="secondary"
            onClick={() => props.onClose(null)}
            label="Cancel"
            type="button"
            tabIndex={1}
          />
        </div>
      </form>
    </IVDialog>
  )
}
