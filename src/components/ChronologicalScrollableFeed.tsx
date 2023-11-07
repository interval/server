import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useLayoutEffect,
} from 'react'
import classNames from 'classnames'
import IVButton from '~/components/IVButton'

interface ChronologicalScrollableFeedProps {
  contents: unknown[]
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
  isFocused?: boolean
}

export default function ChronologicalScrollableFeed({
  contents,
  className,
  style,
  children,
  isFocused,
}: ChronologicalScrollableFeedProps) {
  const container = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)

  useEffect(() => {
    const el = container.current
    if (!el || !isAtBottom) return

    el.scrollTop = el.scrollHeight
  }, [contents, isAtBottom])

  // Automatically scroll to bottom when feed is focused
  // Necessary for usage within reakit tabs (eg TransactionUI ControlPanel)
  useEffect(() => {
    const el = container.current
    if (!el || !isFocused) return

    el.scrollTop = el.scrollHeight
  }, [isFocused])

  const handleContainerScroll = useCallback(() => {
    const el = container.current
    if (!el) return

    setIsAtBottom(
      Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) < 1
    )
  }, [])

  useLayoutEffect(() => {
    const el = container.current
    if (!el) return

    el.addEventListener('scroll', handleContainerScroll)

    return () => {
      el.removeEventListener('scroll', handleContainerScroll)
    }
  }, [handleContainerScroll])

  return (
    <div className={classNames('relative', className)} style={style}>
      <div className="overflow-y-auto max-h-full" ref={container}>
        {children}
      </div>
      <div
        className={classNames('fixed bottom-0 right-0 mr-4 mb-4', {
          hidden: isAtBottom,
        })}
      >
        <IVButton
          label="Scroll to bottom"
          theme="secondary"
          onClick={() => {
            if (!container.current) return
            container.current.scrollTop = container.current.scrollHeight
          }}
        />
      </div>
    </div>
  )
}
