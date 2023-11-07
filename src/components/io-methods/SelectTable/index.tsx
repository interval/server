import { RCTResponderProps } from '~/components/RenderIOCall'
import IVTable from '~/components/IVTable'
import useTableSerializer from '~/components/IVTable/useTableSerializer'
import useInput from '~/utils/useInput'
import { ErrorMessage } from '~/components/IVInputField'
import useTable from '~/components/IVTable/useTable'
import useSelectTableState from './useSelectTableState'
import ComponentHelpText from '~/components/HelpText'

export default function SelectTable(props: RCTResponderProps<'SELECT_TABLE'>) {
  const { data, columns } = useTableSerializer(props)

  const table = useTable({
    data,
    columns,
    isSelectable: true,
    isDownloadable: true,
    isDisabled: props.disabled || props.isSubmitting,
    defaultPageSize: props.defaultPageSize ?? 20,
    totalRecords: props.totalRecords,
    selectedKeys: props.selectedKeys,
    isRemote: 'totalRecords' in props,
    isSortable: props.isSortable ?? true,
    isFilterable: props.isFilterable ?? true,
  })

  const { errorMessage } = useInput(props)

  useSelectTableState(table, props)

  return (
    <div className={errorMessage ? 'has-error' : ''}>
      <div className={`flex items-end ${props.helpText ? 'mb-4' : 'mb-1'}`}>
        <div className="flex-1">
          <h3 className="form-label">{props.label}</h3>
          {props.helpText && (
            <ComponentHelpText className="mt-2">
              {props.helpText}
            </ComponentHelpText>
          )}
        </div>
      </div>
      <IVTable
        tableKey={props.id}
        containerClassName="border border-gray-200 rounded-lg"
        table={table}
        fixedWidthColumns
        showControls
        useMemoizedRows
        renderMarkdown
        selectionCriteria={{
          min: props.minSelections,
          max: props.maxSelections,
          selected: table.selectedKeys.size,
        }}
        emptyMessage="There are no items to display."
        shouldTruncate={!props.shouldDisableTableTruncation}
      />
      {errorMessage && <ErrorMessage id={props.id} message={errorMessage} />}
    </div>
  )
}
