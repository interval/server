import IVTooltip, { TooltipPlacement } from '../IVTooltip'
import classNames from 'classnames'
import InfoIcon from '~/icons/compiled/Info'
import ErrorCircleIcon from '~/icons/compiled/ErrorCircle'

export default function IVConstraintsIndicator({
  constraints,
  placement,
  id,
  error,
}: {
  constraints: React.ReactNode
  id: string
  placement?: TooltipPlacement
  error?: boolean
}) {
  return (
    <IVTooltip
      text={constraints}
      placement={placement ?? 'left-end'}
      className={classNames(
        'py-1 block focus:ring-primary-200 focus:outline-primary-200',
        { 'text-slate-400': !error, 'text-red-800': error }
      )}
      tabIndex={-1}
      id={`${id}-constraints`}
    >
      {error ? (
        <ErrorCircleIcon className="w-3 h-3 cursor-pointer" />
      ) : (
        <InfoIcon className="w-3 h-3 cursor-pointer" />
      )}
    </IVTooltip>
  )
}
