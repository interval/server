import classNames from 'classnames'
import { pluralizeWithCount } from '~/utils/text'
import { useMemo, useState } from 'react'
import RenderValue, { RenderableValue } from '~/components/RenderValue'
import CaretDownIcon from '~/icons/compiled/CaretDown'

export default function KeyValueTable({
  data,
  orientation = 'vertical',
  maxLines = 0,
}: {
  data:
    | Record<string, RenderableValue>
    | [string, RenderableValue][]
    | RenderableValue[]
    | null
  orientation?: 'vertical' | 'horizontal'
  maxLines?: number
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const entries = useMemo(() => {
    const output: [string, RenderableValue][] = Array.isArray(data)
      ? Array.isArray(data[0])
        ? (data as [string, RenderableValue][])
        : (data as RenderableValue[]).map((v, i) => [i.toString(), v])
      : Object.entries(data ?? {})

    if (maxLines && !isExpanded) {
      return output.slice(0, maxLines)
    }

    return output
  }, [isExpanded, data, maxLines])

  if (data == null) return null

  const remainingCount = Object.keys(data).length - maxLines
  const canExpand = !!maxLines && Object.keys(data).length > maxLines

  const tableClassName = 'text-gray-500 w-full block sm:table'
  const rowClassName =
    'border-collapse sm:border-b border-gray-200 last:border-0 block sm:table-row mb-4 sm:mb-0'
  const thClassName = classNames(
    'font-medium text-left sm:px-3 sm:pr-4 sm:py-2 text-gray-800 sm:mb-0 sm:border-r border-gray-200 block sm:table-cell last:border-none align-top',
    {
      'sm:w-[180px]': orientation === 'vertical',
    }
  )
  const tdClassName =
    'sm:px-3 sm:py-2 sm:text-left sm:mb-0 block sm:border-r last:border-none sm:table-cell sm:max-w-0 whitespace-pre-wrap align-top hyphenate'

  if (orientation === 'horizontal') {
    return (
      <div>
        <div className="text-sm max-w-screen-sm rounded-md sm:border sm:border-gray-200">
          <table className={tableClassName}>
            <thead className="sm:border-b border-gray-200">
              <tr className={rowClassName}>
                {entries.map(([key]) => (
                  <th key={key} className={thClassName}>
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className={rowClassName}>
                {entries.map(([key, val]) => (
                  <td key={key} className={tdClassName}>
                    <RenderValue value={val} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        {canExpand && (
          <ExpandCollapseButton
            isExpanded={isExpanded}
            remainingCount={remainingCount}
            onToggle={() => setIsExpanded(prev => !prev)}
          />
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="text-sm max-w-screen-sm rounded-md sm:border sm:border-gray-200">
        <table className={tableClassName}>
          <tbody>
            {entries.map(([key, val]) => (
              <tr key={key} className={rowClassName}>
                <th className={thClassName}>{key}</th>
                <td className={tdClassName}>
                  <RenderValue value={val} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canExpand && (
        <ExpandCollapseButton
          isExpanded={isExpanded}
          remainingCount={remainingCount}
          onToggle={() => setIsExpanded(prev => !prev)}
        />
      )}
    </div>
  )
}

function ExpandCollapseButton({
  isExpanded,
  remainingCount,
  onToggle,
}: {
  isExpanded: boolean
  onToggle: () => void
  remainingCount: number
}) {
  return (
    <button
      className="inline-block mt-1.5 font-medium text-gray-500 text-xs hover:text-primary-500 group"
      onClick={onToggle}
    >
      <CaretDownIcon
        className={classNames(
          'relative -top-px text-gray-400 group-hover:text-primary-500 inline-block w-4 h-4',
          {
            'rotate-180': isExpanded,
          }
        )}
      />
      {isExpanded
        ? 'Collapse'
        : `Show ${pluralizeWithCount(
            remainingCount,
            'more attribute',
            'more attributes'
          )}`}
    </button>
  )
}
