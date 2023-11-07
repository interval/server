import { useMemo } from 'react'
import { MetaItemSchema } from '@interval/sdk/dist/classes/Layout'
import RenderValue from '../RenderValue'
import { IVTableCellValueObject } from '~/components/IVTable/useTable'
import useRenderContext from '../RenderContext'

interface MetadataValueProps {
  item: MetaItemSchema
}

/*
 * We wrap/reuse TableCell component because logic is largely similar
 */
export default function MetadataValue({ item }: MetadataValueProps) {
  const { getActionUrl } = useRenderContext()

  const cell = useMemo(() => {
    const { label, value, action, route, ...rest } = item
    const cell: IVTableCellValueObject = {
      ...rest,
      label: 'value' in item ? value : null,
    }

    const slug = route ?? action

    if (slug && typeof slug === 'string') {
      cell.url = getActionUrl({
        slug,
        params: cell.params,
      })
      cell.isInternalActionUrl = true
    }

    return cell
  }, [item, getActionUrl])

  return <RenderValue value={cell} showSkeleton />
}
