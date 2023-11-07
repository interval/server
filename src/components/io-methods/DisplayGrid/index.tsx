import useTable from '~/components/IVTable/useTable'
import useDisplayTableState from '../DisplayTable/useDisplayTableState'
import IVMediaGrid from '~/components/IVMediaGrid'
import { GridItem } from '@interval/sdk/dist/ioSchema'
import { RCTResponderProps } from '~/components/RenderIOCall'
import ComponentHelpText from '~/components/HelpText'

export default function DisplayGrid(props: RCTResponderProps<'DISPLAY_GRID'>) {
  const table = useTable<GridItem>({
    columns: [],
    data: props.data,
    defaultPageSize: props.defaultPageSize ?? 20,
    totalRecords: props.totalRecords,
    isRemote: props.isAsync || 'totalRecords' in props,
    isFilterable: props.isFilterable,
    shouldCacheRecords: !props.isAsync,
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
      <div className="relative">
        <IVMediaGrid
          table={table}
          idealColumnWidth={props.idealColumnWidth ?? 400}
        />
      </div>
    </div>
  )
}
