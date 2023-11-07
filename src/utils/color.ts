export const ENV_COLOR_OPTIONS = {
  none: null,
  red: '#dc2626',
  orange: '#f59e0b',
  green: '#65a30d',
  cyan: '#06b6d4',
  indigo: '#4f46e5',
  pink: '#d946ef',
  gray: '#9ca3af',
}

export type EnvColor = keyof typeof ENV_COLOR_OPTIONS

export function colorStringToHexCode(
  color: string | null | undefined
): string | undefined {
  if (!color || !(color in ENV_COLOR_OPTIONS)) return undefined

  return ENV_COLOR_OPTIONS[color]
}

export function colorStringToBorderClassNames(
  color: string | null | undefined
): string | undefined {
  switch (color) {
    case 'none':
    case null:
    case undefined:
      return 'border-gray-300'
    case 'red':
      return 'ring-red-400 border-transparent'
    case 'orange':
      return 'ring-amber-400 border-transparent'
    case 'green':
      return 'ring-lime-400 border-transparent'
    case 'teal':
      return 'ring-teal-400 border-transparent'
    case 'indigo':
      return 'ring-indigo-400 border-transparent'
    case 'pink':
      return 'ring-pink-400 border-transparent'
    case 'gray':
      return 'ring-gray-400 border-transparent'
    default:
      return undefined
  }
}
