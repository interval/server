import classNames from 'classnames'

export interface IVStatusPillProps {
  kind: 'danger' | 'success' | 'warn' | 'info'
  label: string
}

export default function IVStatusPill({ kind, label }: IVStatusPillProps) {
  return (
    <span
      className={classNames(
        'flex-shrink-0 inline-block tracking-normal px-2 py-1 text-xs font-medium rounded-xl leading-4',
        {
          'text-green-800 bg-green-100': kind === 'success',
          'text-red-800 bg-red-100': kind === 'danger',
          'text-orange-800 bg-orange-100': kind === 'warn',
          'bg-gray-100 text-gray-600': kind === 'info',
        }
      )}
    >
      {label}
    </span>
  )
}
