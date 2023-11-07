import classNames from 'classnames'

interface IVToggleProps {
  value: boolean
  onChange: (value: boolean) => void
  label: string
}

export default function IVToggle({ value, onChange, label }: IVToggleProps) {
  // TODO: something better, probably in props
  return (
    <div className="flex items-center space-x-1">
      <span className="flex flex-col mr-2">
        <span className="text-sm font-medium text-gray-900" id={label}>
          {label}
        </span>
      </span>

      <button
        type="button"
        onClick={() => onChange(!value)}
        className={classNames(
          'bg-gray-200 relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
          value && 'bg-primary-600'
        )}
        role="switch"
        aria-checked={value ? 'true' : 'false'}
        aria-labelledby={label}
      >
        <span
          aria-hidden="true"
          className={classNames(
            'translate-x-0 pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200',
            value && 'translate-x-5'
          )}
        ></span>
      </button>
    </div>
  )
}
