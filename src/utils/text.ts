import {
  UserAccessPermission,
  UsageEnvironment,
  TransactionStatus,
  TransactionResultStatus,
  ActionAvailability,
  ActionAccessLevel,
  ConfiguredFeatureFlag,
  HostInstanceStatus,
} from '@prisma/client'

export function ucfirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.substring(1)
}

export function pluralize(
  num: number,
  singular: string,
  plural?: string
): string {
  if (!plural) {
    plural = `${singular}s`
  }

  return num === 1 ? singular : plural
}

export function pluralizeWithCount(
  num: number,
  singular: string,
  plural?: string,
  options?: {
    commas?: boolean
  }
): string {
  const x = options?.commas ? numberWithCommas(num) : num
  return `${x} ${pluralize(num, singular, plural)}`
}

function enumToString(val: string): string {
  const str = val.toLowerCase().replace(/[^a-z0-9]/g, ' ')
  return str[0].toUpperCase() + str.slice(1)
}

export function hostStatusToString(status: HostInstanceStatus): string {
  return enumToString(status)
}

export function statusEnumToString(
  status: TransactionStatus | TransactionResultStatus
): string {
  switch (status) {
    case 'HOST_CONNECTION_DROPPED':
      return 'Connection lost'
    case 'CLIENT_CONNECTION_DROPPED':
      return 'Closed'
    case 'FAILURE':
      return 'Error'
    case 'SUCCESS':
      return 'Completed'
    default:
      return enumToString(status)
  }
}

export function usageEnvironmentToString(env: UsageEnvironment): string {
  return env.charAt(0) + env.substring(1).toLowerCase()
}

export function userAccessPermissionToString(
  perm: UserAccessPermission
): string {
  switch (perm) {
    case 'ACTION_RUNNER':
      return 'Member'
    case 'READONLY_VIEWER':
      return 'Auditor'
    default:
      return enumToString(perm).replace('api', 'API')
  }
}

export function actionAvailabilityToString(
  availability: ActionAvailability
): string {
  switch (availability) {
    case 'GROUPS':
      return 'Teams'
    default:
      return enumToString(availability)
  }
}

export function actionAccessLevelToString(level: ActionAccessLevel): string {
  return enumToString(level)
}

export function slugToName(slug: string): string {
  if (slug.includes('/')) {
    slug = slug.substring(slug.lastIndexOf('/') + 1)
  }

  if (slug === slug.toUpperCase()) {
    slug = slug.toLowerCase()
  }

  // Don't split on multiple caps in a row like URL
  const matches = slug.match(/[A-Z][A-Z]+/g)
  if (matches && matches.length) {
    for (const match of matches) {
      const toReplace = match.substring(0, match.length - 1)
      slug = slug.replace(toReplace, ` ${toReplace.toLowerCase()} `)
    }
  }

  return ucfirst(
    slug
      .replace(/[-_.]+/g, ' ')
      // Split on camelCase and whitespace
      .split(/((?!^)(?=[A-Z]))|\s+/g)
      .filter(Boolean)
      .map(s => s.trim())
      .filter(s => s.length)
      .map(s => s.toLowerCase())
      .join(' ')
  )
}

export function featureFlagToString(flag: ConfiguredFeatureFlag): string {
  return enumToString(flag)
}

export function commaSeparatedList(
  items: string[],
  conjunction = 'or'
): string {
  if (!items.length) return ''

  if (items.length === 1) {
    return items[0]
  }

  if (items.length === 2) {
    return `${items[0]} ${conjunction} ${items[1]}`
  }

  return `${items.slice(0, -1).join(', ')}, ${conjunction} ${
    items[items.length - 1]
  }`
}

export function numberWithCommas(num: number): string {
  return num.toLocaleString('en-US')
}
