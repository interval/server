import classNames from 'classnames'

export interface IVAvatarProps {
  /** the default className contains the default width, w-10 h-10. include a width if overriding this! */
  className?: string
  name?: string
  imageUrl?: string | null
  /** customize the text size if needed; the default should be OK for most usage */
  textSizeClassName?: string
  shape?: 'circle' | 'roundrect'
}

export default function IVAvatar(props: IVAvatarProps) {
  const {
    className = 'w-10 h-10',
    textSizeClassName = 'text-base',
    shape = 'circle',
  } = props

  const initials = props.name
    ?.toUpperCase()
    .split(' ')
    .map(word => word[0])
    .join('')
    .slice(0, 2)

  return (
    <span
      className={classNames(
        'inline-flex items-center relative',
        className,
        textSizeClassName,
        {
          'rounded-full': shape === 'circle',
          'rounded-md': shape === 'roundrect',
          'bg-gray-500': !props.imageUrl && !props.className?.includes('bg-'),
        }
      )}
    >
      {props.imageUrl ? (
        <img
          src={props.imageUrl}
          alt={props.name}
          className={classNames('absolute inset-0 object-cover', {
            'rounded-full': shape === 'circle',
            'rounded-md': shape === 'roundrect',
          })}
        />
      ) : (
        <span className="block w-full font-medium leading-none text-center text-white whitespace-nowrap">
          {initials}
        </span>
      )}
    </span>
  )
}
