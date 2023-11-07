import {
  Hovercard,
  HovercardAnchor,
  useHovercardState,
} from 'ariakit/hovercard'

type BasePlacement = 'top' | 'bottom' | 'left' | 'right'

export type TooltipPlacement =
  | BasePlacement
  | `${BasePlacement}-start`
  | `${BasePlacement}-end`

export default function IVTooltip({
  id,
  text,
  children,
  placement = 'top',
  className,
  tabIndex,
  showTimeout = 250,
  hideTimeout = 250,
}: {
  id?: string
  text: React.ReactNode
  children: React.ReactNode
  placement?: TooltipPlacement
  className?: string
  tabIndex?: number
  showTimeout?: number
  hideTimeout?: number
}) {
  const hovercard = useHovercardState({
    animated: 300,
    placement,
    gutter: 10,
    showTimeout,
    hideTimeout,
  })

  if (!text) {
    return <>{children}</>
  }

  return (
    <>
      <HovercardAnchor
        state={hovercard}
        tabIndex={tabIndex}
        className={className}
      >
        {children}
      </HovercardAnchor>
      <Hovercard
        state={hovercard}
        style={{ maxWidth: 240 }}
        className="z-20 iv-tooltip"
      >
        <div
          className="rounded-md bg-white text-gray-500 text-[13px] px-2 py-1.5 leading-5 transition-all duration-150 opacity-0 border border-gray-200 shadow-lg z-20 text-left"
          id={id}
        >
          {text}
        </div>
      </Hovercard>
    </>
  )
}
