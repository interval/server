import classNames from 'classnames'
import IconCancel from '~/icons/compiled/Cancel'
import { useLocalStorage } from '~/utils/localStorage'

interface IVAlertProps {
  id?: string
  theme: 'info' | 'warning'
  children: React.ReactNode
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  className?: string
  dismissible?: boolean
}

export default function IVAlert({
  id,
  theme,
  children,
  className,
  dismissible,
  ...props
}: IVAlertProps) {
  const [isDismissed, setIsDismissed] = useLocalStorage(
    `alertDismissed-${id}`,
    false
  )
  if (id && dismissible && (isDismissed || isDismissed === undefined)) {
    return null
  }

  return (
    <div
      className={classNames(
        'text-sm px-4 py-3 rounded-md flex items-start',
        {
          'bg-sky-50 text-blue-900': theme === 'info',
          'bg-amber-100 bg-opacity-50 text-yellow-900': theme === 'warning',
        },
        className
      )}
    >
      {props.icon && (
        <props.icon
          className={classNames('w-3 h-3 mt-1 mr-2.5 flex-none', {
            'text-primary-300': theme === 'info',
            'text-amber-500': theme === 'warning',
          })}
        />
      )}
      <div>{children}</div>
      {dismissible && (
        <button
          type="button"
          className="ml-auto pl-2"
          onClick={() => setIsDismissed(true)}
        >
          <span className="sr-only">Dismiss info</span>
          <IconCancel
            className="w-4 h-4 text-primary-300 mt-0.5"
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  )
}
