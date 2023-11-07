import { MetaItemSchema } from '@interval/sdk/dist/classes/Layout'
import classNames from 'classnames'
import Skeleton from 'react-loading-skeleton'
import IVConstraintsIndicator from '~/components/IVConstraintsIndicator'
import MetadataValue from './MetadataValue'

export function MetadataCard({ item }: { item: MetaItemSchema }) {
  return (
    <div className={classNames('bg-white shadow rounded-md p-4 pb-3')}>
      <dt className="text-sm text-gray-500 mb-2 leading-5 font-medium hyphenate">
        {item.label}
      </dt>
      {item.error ? (
        <div className="pt-1 flex">
          <span className="text-sm text-red-800">Error loading metadata</span>
          <span className="pl-2">
            <IVConstraintsIndicator
              error={true}
              constraints={<span className="text-red-800">{item.error}</span>}
              id="admin-explanation"
              placement="right"
            />
          </span>
        </div>
      ) : (
        <dd className="text-xl md:text-2xl font-medium text-gray-900 tracking-tight leading-tight md:leading-8 hyphenate">
          {'value' in item && item.value === undefined && !item.image?.url ? (
            <Skeleton width={80} duration={1} />
          ) : (
            <MetadataValue item={item} />
          )}
        </dd>
      )}
    </div>
  )
}

function getGridClassName(itemsCount: number) {
  if (itemsCount === 2) return 'grid-cols-2'
  if (itemsCount === 3) return 'sm:grid-cols-3'
  if (itemsCount >= 4) return 'grid-cols-2 md:grid-cols-4'
}

export interface MetadataCardListProps {
  label?: string
  items: MetaItemSchema[]
}

export default function MetadataCardList({
  label,
  items,
}: MetadataCardListProps) {
  return (
    <div>
      {label && <h4 className="form-label mb-2">{label}</h4>}
      <dl className={classNames('grid gap-4', getGridClassName(items.length))}>
        {items.map((item, i) => (
          <MetadataCard item={item} key={i} />
        ))}
      </dl>
    </div>
  )
}
