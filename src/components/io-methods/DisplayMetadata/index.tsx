import { RCTResponderProps } from '~/components/RenderIOCall'
import classNames from 'classnames'
import { T_IO_PROPS } from '@interval/sdk/dist/ioSchema'
import MetadataCardList from '~/components/MetadataCardList'
import MetadataValue from '~/components/MetadataCardList/MetadataValue'

function MetadataItem({
  layout,
  item,
}: {
  layout: T_IO_PROPS<'DISPLAY_METADATA'>['layout']
  item: T_IO_PROPS<'DISPLAY_METADATA'>['data'][0]
}) {
  return (
    <div
      className={classNames({
        'md:table-row pb-6 md:pb-0': layout === 'list',
      })}
    >
      <dt
        className={classNames('form-label mb-0 hyphenate', {
          'md:table-cell min-w-[90px] max-w-[300px] md:pb-4 pr-6 md:align-top':
            layout === 'list',
          'pb-1': layout === 'grid',
        })}
      >
        {item.label}
      </dt>
      <dd className="md:table-cell md:pb-4 md:align-top hyphenate">
        <span className="inline">
          <MetadataValue item={item} />
        </span>
      </dd>
    </div>
  )
}

function getGridClassName(itemsCount: number) {
  if (itemsCount === 2) return 'gap-6 grid-cols-2'
  if (itemsCount === 3) return 'gap-6 sm:grid-cols-3'
  if (itemsCount >= 4) return 'gap-6 grid-cols-2 md:grid-cols-4'
  return ''
}

export default function DisplayMetadata({
  label,
  layout = 'grid',
  data,
}: RCTResponderProps<'DISPLAY_METADATA'>) {
  if (layout === 'card') {
    return <MetadataCardList label={label} items={data} />
  }

  return (
    <div className="text-sm">
      {label && (
        <h4 className="form-group-label mb-2 flex items-center border-none">
          {label}
        </h4>
      )}
      <dl
        className={classNames({
          ['grid ' + getGridClassName(data.length)]: layout === 'grid',
          'md:table max-w-[900px]': layout === 'list',
        })}
      >
        {data.map((col, i) => (
          <MetadataItem key={i} item={col} layout={layout ?? 'grid'} />
        ))}
      </dl>
    </div>
  )
}
