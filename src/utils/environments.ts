import { ENV_COLOR_OPTIONS } from './color'

export const PRODUCTION_ORG_ENV_SLUG = 'production'
export const PRODUCTION_ORG_ENV_NAME = 'Production'
export const DEVELOPMENT_ORG_ENV_SLUG = 'development'
export const DEVELOPMENT_ORG_ENV_NAME = 'Development'
export const DEVELOPMENT_ORG_DEFAULT_COLOR: keyof typeof ENV_COLOR_OPTIONS =
  'orange'

export const legacy_switchToEnvironment = (
  orgEnvSlug: string,
  slug: string,
  options?: { showTooltipOnSwitch: true }
) => {
  let url = location.pathname.replace(
    `/dashboard/${orgEnvSlug}`,
    `/dashboard/${slug}`
  )

  if (options?.showTooltipOnSwitch) {
    url += '?show-env-switcher-tooltip'
  }

  window.location.href = url
}

export function getOrgEnvSlug(
  envSlug: string | undefined | null,
  orgSlug: string
) {
  if (envSlug === DEVELOPMENT_ORG_ENV_SLUG) return `${orgSlug}/develop`

  return envSlug && envSlug !== PRODUCTION_ORG_ENV_SLUG
    ? `${orgSlug}+${envSlug}`
    : orgSlug
}

export function envRootPath(path: string) {
  const parts = path.split('/')
  if (parts[3] === 'develop') {
    return parts.slice(0, 4).join('/')
  } else {
    return parts.slice(0, 3).join('/')
  }
}
