import useTable from '~/components/IVTable/useTable'
import useDisplayTableState from './useDisplayTableState'
import useTableSerializer from '~/components/IVTable/useTableSerializer'
import { RCTResponderProps } from '~/components/RenderIOCall'
import IVTable from '~/components/IVTable'
import ComponentHelpText from '~/components/HelpText'

// IVTable also has an empty state, but we want a different UI for empty tables in the transaction UI.
export function TransactionTableEmptyState({ message }: { message?: string }) {
  return (
    <div className="py-8 text-gray-500 border border-gray-200 rounded-lg text-center">
      {message ?? 'There are no items to display.'}
    </div>
  )
}

export default function DisplayTable(
  props: RCTResponderProps<'DISPLAY_TABLE'>
) {
  const { data, columns } = useTableSerializer(props)

  const table = useTable({
    data,
    columns,
    isDownloadable: !props.isAsync,
    defaultPageSize:
      props.defaultPageSize ?? (props.orientation === 'vertical' ? 5 : 20),
    totalRecords: props.totalRecords,
    isRemote: props.isAsync || 'totalRecords' in props,
    shouldCacheRecords: !props.isAsync,
    isSortable: props.isSortable ?? true,
    isFilterable: props.isFilterable ?? true,
  })

  useDisplayTableState(table, props)

  return (
    <div>
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
        filename={props.label}
        orientation={props.orientation}
        fixedWidthColumns
        showControls
        useMemoizedRows
        renderMarkdown
        emptyMessage="There are no items to display."
        shouldTruncate={!props.shouldDisableTableTruncation}
      />
    </div>
  )
}
