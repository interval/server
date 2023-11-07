import { useState, useMemo, useEffect, useRef } from 'react'
import { z, ZodError } from 'zod'
import * as Papa from 'papaparse'
import { extractColumns } from '@interval/sdk/dist/utils/spreadsheet'
import { RCTResponderProps } from '~/components/RenderIOCall'
import { IOComponentError } from '~/components/RenderIOCall/ComponentError'
import SpreadsheetEditor from './SpreadsheetEditor'
import IVButton from '~/components/IVButton'
import Importer from './Importer'
import IVDialog, { useDialogState } from '~/components/IVDialog'
import { castValue, generateBlankRow, parseCSV } from './helpers'
import { DialogStateReturn } from 'reakit/ts'
import { ErrorMessage } from '~/components/IVInputField'
import useInput from '../useInput'
import { logger } from '~/utils/logger'

// TODO: Remove this limit
// Limit rows for now for performance
const ROW_LIMIT = 1000

export type RecordValue = string | number | boolean | null
export type OutputSchemaBase = z.ZodArray<z.ZodObject<any>>
export type ParsedImport = Papa.ParseStepResult<any>

export default function InputSpreadsheet(
  props: RCTResponderProps<'INPUT_SPREADSHEET'> & {
    // private prop for Storybook, for now
    data?: Record<string, RecordValue>[]
  }
) {
  const { columns } = props
  const outputSchema = useMemo(() => extractColumns(columns), [columns])
  type OutputType = z.infer<typeof outputSchema>

  const { errorMessage } = useInput({
    ...props,
    noValueMessage: 'Please input at least one row before continuing.',
  })

  const sheetRef = useRef<HTMLDivElement>(null)

  const [limitExceeded, setLimitExceeded] = useState(false)
  const [parseError, setParseError] = useState<ZodError | null>(null)

  const pasteDialog = useDialogState()
  const importerDialog = useDialogState()

  const [recordsToImport, setRecordsToImport] =
    useState<Papa.ParseStepResult<any> | null>(null)

  const [records, setRecords] = useState<OutputType | null>(() => {
    if (props.data) return props.data
    if (props.value && !(props.value instanceof IOComponentError)) {
      const recordShape = outputSchema._def.type._def.shape()
      return props.value.map(row => {
        const ret = {}
        for (const [key, val] of Object.entries(row)) {
          ret[key] = castValue(val ?? null, recordShape[key])
        }

        return ret
      })
    }
    return generateBlankRow(outputSchema)
  })

  const { onUpdatePendingReturnValue } = props

  useEffect(() => {
    setLimitExceeded(false)

    if (records) {
      try {
        const parsed = outputSchema.parse(records)

        if (parsed.length > ROW_LIMIT) {
          setLimitExceeded(true)
          throw new Error(`Exceeded row limit of ${ROW_LIMIT}`)
        }

        setParseError(null)
        onUpdatePendingReturnValue(parsed)
      } catch (err) {
        logger.error('Error parsing spreadsheet value', { error: err })
        if (err instanceof ZodError) {
          setParseError(err)
          onUpdatePendingReturnValue(
            new IOComponentError(
              'There are one or more issues with the data you entered. Please correct the data and try again.'
            )
          )
        } else {
          setParseError(null)
          onUpdatePendingReturnValue(undefined)
        }
      }
    } else {
      setParseError(null)
      onUpdatePendingReturnValue(undefined)
    }
  }, [records, outputSchema, onUpdatePendingReturnValue, logger])

  const onImportComplete = (result: Record<string, RecordValue>[] | null) => {
    // don't apply an empty result, which would clear everything from the table
    if (result?.length) setRecords(result)
    importerDialog.hide()
  }

  const onAcceptPlaintextCsv = (file: string | File) => {
    parseCSV(file)
      .then(setRecordsToImport)
      .then(() => {
        pasteDialog.hide()
        importerDialog.show()
      })
      .catch(error => {
        logger.error('Error parsing spreadsheet', { error })
      })
  }

  const onEnterManually = () => {
    const firstCell = sheetRef.current?.querySelectorAll(
      'td[data-row="0"][data-col="0"]'
    )[0]

    // triggering all of these is necessary to register datasheet's normal event listeners.
    ;['mousedown', 'mouseup', 'dblclick'].map(evt => {
      firstCell?.dispatchEvent(
        new MouseEvent(evt, {
          view: window,
          bubbles: true,
          cancelable: true,
        })
      )
    })
  }

  return (
    <div className="space-y-4">
      <h2 className="h3 text-gray-900">{props.label}</h2>

      <div className="flex items-start justify-start space-x-2">
        <IVButton
          theme="secondary"
          label="Upload CSV"
          id="action-upload"
          htmlFor="csv-upload"
          disabled={props.isSubmitting}
        />
        <IVButton
          theme="secondary"
          label="Paste data"
          id="action-paste"
          onClick={pasteDialog.show}
          disabled={props.isSubmitting}
        />
        <IVButton
          theme="secondary"
          label="Enter manually"
          id="action-manual"
          onClick={onEnterManually}
          disabled={props.isSubmitting}
        />

        <input
          type="file"
          accept=".csv"
          className="sr-only"
          id="csv-upload"
          disabled={props.isSubmitting}
          onChange={async e => {
            if (!e.target.files) return
            const file = e.target.files[0]
            if (!file) return
            onAcceptPlaintextCsv(file)
          }}
        />
      </div>

      {records && (
        <SpreadsheetEditor
          id={props.id}
          records={records}
          onChange={setRecords}
          parseError={parseError}
          outputSchema={outputSchema}
          ref={sheetRef}
          disabled={props.isSubmitting}
        />
      )}

      {limitExceeded && (
        <p className="px-4 py-3 text-sm font-medium text-red-800 rounded-md bg-red-50">
          Sorry, spreadsheets are currently limited to {ROW_LIMIT} rows.
        </p>
      )}

      {errorMessage && <ErrorMessage id={props.id} message={errorMessage} />}

      <Importer
        dialog={importerDialog}
        onClose={onImportComplete}
        input={recordsToImport}
        columns={props.columns}
      />
      <PasteDialog dialog={pasteDialog} onPaste={onAcceptPlaintextCsv} />
    </div>
  )
}

function PasteDialog({
  dialog,
  onPaste,
  value: seedValue,
}: {
  dialog: DialogStateReturn
  onPaste: (data: string) => void
  value?: string
}) {
  const [value, setValue] = useState(seedValue || '')

  useEffect(() => {
    // clear the textarea on hide
    if (!dialog.animating && !dialog.visible) {
      setValue('')
    }
  }, [dialog.animating, dialog.visible])

  return (
    <IVDialog dialog={dialog} title="Paste CSV data">
      <div>
        <textarea
          className="form-input block w-full"
          autoFocus
          rows={5}
          value={value}
          onChange={e => setValue(e.target.value)}
          onPaste={e => onPaste(e.clipboardData.getData('text/plain'))}
        />
        <div className="border-t border-gray-200 pt-4 mt-6 flex items-start justify-start space-x-2">
          <IVButton
            type="submit"
            theme="primary"
            onClick={() => onPaste(value)}
            label="Next"
          />
          <IVButton
            theme="secondary"
            onClick={dialog.hide}
            label="Cancel"
            type="button"
          />
        </div>
      </div>
    </IVDialog>
  )
}
