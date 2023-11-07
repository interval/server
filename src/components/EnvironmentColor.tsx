import classNames from 'classnames'
import IconCheck from '~/icons/compiled/Check'
import { colorStringToHexCode } from '~/utils/color'

export default function EnvironmentColor({
  color,
  selected = false,
  size = 'md',
}: {
  color: string | null | undefined
  selected?: boolean
  size?: 'sm' | 'md'
}) {
  return (
    <span
      className={classNames(
        'inline-flex items-center justify-center w-2.5 h-2.5 border bg-no-repeat peer-checked:ring-2 peer-checked:ring-offset-2 text-opacity-0 peer-checked:text-opacity-100 text-white',
        {
          'border-gray-300': !color || color === 'none',
          'border-transparent': !!color && color !== 'none',
          'ring-red-300': color === 'red',
          'ring-amber-300': color === 'orange',
          'ring-lime-400': color === 'green',
          'ring-teal-300': color === 'teal',
          'ring-indigo-300': color === 'indigo',
          'ring-pink-300': color === 'pink',
          'ring-gray-300': color === 'gray',
          'w-2.5 h-2.5 rounded': size === 'sm',
          'w-4 h-4 rounded-md': size === 'md',
        }
      )}
      style={{
        background:
          color === 'none'
            ? 'linear-gradient(-45deg, #fff calc(50% - 1px), red calc(50% - 1px), red calc(50% + 1px), white calc(50% + 1px))'
            : colorStringToHexCode(color),
      }}
    >
      {selected && color !== 'none' && <IconCheck className="w-3 h-3" />}
    </span>
  )
}
