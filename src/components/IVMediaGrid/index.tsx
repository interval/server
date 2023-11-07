import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { UseTableResult } from '../IVTable/useTable'
import MediaGridItem from './MediaGridItem'
import { GridItem } from '@interval/sdk/dist/ioSchema'
import { TableControls } from '../IVTable/DesktopTable'
import useWindowSize from '~/utils/useWindowSize'

function useGrid({
  idealColumnWidth,
  gap,
  data,
}: {
  idealColumnWidth: number
  gap: number
  data: UseTableResult<GridItem>['data']
}) {
  const { width, height } = useWindowSize()
  const firstItemRef = useRef<HTMLDivElement>(null)
  const [itemHeight, setItemHeight] = useState(200)

  const minWidth = idealColumnWidth - idealColumnWidth / 8
  const columnCount = Math.floor(width / (minWidth + gap))
  const columnWidth = Math.floor(height / columnCount - gap)

  useLayoutEffect(() => {
    if (!firstItemRef.current) return
    setItemHeight(firstItemRef.current.getBoundingClientRect().height)
  }, [data])

  return {
    columnCount,
    columnWidth,
    itemHeight,
    firstItemRef,
  }
}

const MIN_USER_COLUMN_WIDTH = 100

export type IVMediaGridProps = {
  idealColumnWidth: number
  table: UseTableResult<GridItem>
}

export default function IVMediaGrid(props: IVMediaGridProps) {
  const [lastRowsCount, setLastRowsCount] = useState(10)

  const { columnCount, itemHeight, firstItemRef } = useGrid({
    idealColumnWidth: Math.max(MIN_USER_COLUMN_WIDTH, props.idealColumnWidth),
    data: props.table.data,
    gap: 32,
  })

  const [isStuck, setIsStuck] = useState(false)
  const headerEl = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!props.table.currentPage.length) return
    setLastRowsCount(props.table.currentPage.length)
  }, [props.table.currentPage.length])

  // toggle .rounded-t-lg when the header becomes stuck/unstuck
  useEffect(() => {
    if (!headerEl.current) return

    const observer = new IntersectionObserver(
      ([e]) => setIsStuck(e.intersectionRatio < 1),
      { threshold: [1] }
    )

    observer.observe(headerEl.current)
  }, [])

  return (
    <div ref={headerEl} className="sticky -top-px z-10 text-sm">
      <div className="-mx-2 mb-1">
        <TableControls location="top" {...props} isStuck={isStuck} />
      </div>
      {props.table.currentPage.length > 0 ? (
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
            gap: 30,
          }}
          role="grid"
        >
          {props.table.currentPage.map((item, idx) => (
            <MediaGridItem
              key={item.key}
              ref={idx === 0 ? firstItemRef : undefined}
              {...item.data}
            />
          ))}
        </div>
      ) : (
        <>
          {props.table.isFetching ? (
            // loading state consists of empty rows x the previous number of rows
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                gap: 30,
              }}
              role="grid"
            >
              {Array.from({ length: lastRowsCount }).map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-md bg-gray-50"
                  style={{ height: itemHeight }}
                >
                  &nbsp;
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4 text-gray-500">
              {props.table.searchQuery ? (
                <p>No records found matching '{props.table.searchQuery}'</p>
              ) : (
                <p>No records found</p>
              )}
            </div>
          )}
        </>
      )}
      <div className="pt-2 border-t border-gray-200 mt-4">
        <div className="-mx-2">
          <TableControls location="top" {...props} isStuck={isStuck} />
        </div>
      </div>
    </div>
  )
}
