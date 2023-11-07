import { useEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import CaretDownIcon from '~/icons/compiled/CaretDown'

const DEFAULT_CELL_HEIGHT = 220
const EXPANDED_CELL_HEIGHT = 600

export default function Truncate({ children }: { children: React.ReactNode }) {
  const scrollingEl = useRef<HTMLDivElement>(null)
  const contentsEl = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)

  useEffect(() => {
    if (!isExpanded) {
      scrollingEl.current?.scrollTo(0, 0)
    }
  }, [isExpanded])

  useEffect(() => {
    if (!contentsEl.current || !scrollingEl.current) return

    const contentsHeight = contentsEl.current.getBoundingClientRect().height
    const scrollingHeight = scrollingEl.current.getBoundingClientRect().height

    setIsTruncated(contentsHeight > scrollingHeight)
  }, [children])

  return (
    <div className="group/cell">
      <div
        ref={scrollingEl}
        style={{
          maxHeight:
            isTruncated && isExpanded
              ? EXPANDED_CELL_HEIGHT
              : DEFAULT_CELL_HEIGHT,
        }}
        className={classNames({
          'overflow-hidden': isTruncated && !isExpanded,
          'overflow-y-auto': isTruncated && isExpanded,
        })}
        aria-expanded={isExpanded}
      >
        <div ref={contentsEl}>{children}</div>
      </div>
      <div
        className={classNames('relative flex justify-center items-end', {
          'h-0': !isExpanded,
          'h-8': isExpanded,
          hidden: !isTruncated,
        })}
      >
        <div
          className={classNames(
            'inline-block rounded-full shadow-truncate-button transition-all duration-150',
            {
              'opacity-0 translate-y-1 group-hover/cell:translate-y-0 group-hover/cell:opacity-100':
                !isExpanded,
            }
          )}
        >
          <button
            type="button"
            className={classNames(
              'text-center font-medium text-xs cursor-pointer bg-white border border-gray-200 shadow-sm text-gray-600 pl-2.5 pr-1.5 h-6 rounded-full inline-flex items-center hover:text-gray-500/80'
            )}
            onClick={e => {
              // prevent checkbox from being toggled
              e.stopPropagation()
              setIsExpanded(prev => !prev)
            }}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
            <CaretDownIcon
              className={classNames('inline-block w-3 h-3 ml-0.5', {
                'transform rotate-180': isExpanded,
              })}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
