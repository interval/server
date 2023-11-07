import classNames from 'classnames'
import { useEffect, useState } from 'react'

interface IVSpinnerProps {
  className?: string
  /* covers the content area but not the sidebar */
  fullPage?: boolean
  delayDuration?: number
}

function Spinner() {
  return (
    <svg viewBox="0 0 150 150" className="w-full animate-loading-outer">
      <circle
        className="animate-loading-inner"
        cx="75"
        cy="75"
        r="60"
        style={{
          strokeDashoffset: 600,
          strokeDasharray: 300,
          strokeWidth: 16,
          strokeMiterlimit: 10,
          strokeLinecap: 'round',
          stroke: 'currentColor',
          fill: 'transparent',
        }}
      />
    </svg>
  )
}

export default function IVSpinner(props: IVSpinnerProps) {
  const { className = 'w-8', delayDuration = 0 } = props

  const [shouldShow, setShouldShow] = useState(delayDuration === 0)

  useEffect(() => {
    const to = setTimeout(() => {
      setShouldShow(true)
    }, delayDuration)
    return () => {
      clearTimeout(to)
    }
  }, [delayDuration])

  if (!shouldShow) return null

  if (props.fullPage) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center iv-full-page-spinner"
        data-pw-spinner
      >
        <div className="w-8">
          <Spinner />
        </div>
      </div>
    )
  }

  return (
    <div className={classNames('relative', className)} data-pw-spinner>
      <Spinner />
    </div>
  )
}
