import { useCallback, useMemo, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useOrgParams } from './organization'
import { OrgSwitcherState } from './useOrgSwitcher'
import { atom, useRecoilState } from 'recoil'
import { useHasPermission } from '~/components/DashboardContext'
import {
  PRODUCTION_ORG_ENV_NAME,
  PRODUCTION_ORG_ENV_SLUG,
  DEVELOPMENT_ORG_ENV_NAME,
  DEVELOPMENT_ORG_ENV_SLUG,
  getOrgEnvSlug,
} from './environments'

export const hasRecentlySwitchedEnv = atom<boolean>({
  key: 'hasRecentlySwitchedEnv',
  default: false,
})

export default function useEnvSwitcher({
  organization,
  envSlug,
}: Pick<OrgSwitcherState, 'orgEnvSlug' | 'envSlug' | 'organization'>) {
  const [hasRecentlySwitched, setHasRecentlySwitchedEnv] = useRecoilState(
    hasRecentlySwitchedEnv
  )
  const location = useLocation()
  const navigate = useNavigate()
  const { orgSlug, orgEnvSlug, isDevMode, ...params } = useOrgParams()
  const actionSlug = params['*'] as string
  const hasDevAccess = useHasPermission('RUN_DEV_ACTIONS')

  const isProduction = orgSlug === orgEnvSlug && !isDevMode

  useEffect(() => {
    const clearEnvSwitch = setTimeout(() => {
      if (hasRecentlySwitched) {
        setHasRecentlySwitchedEnv(false)
      }
    }, 1000)

    return () => clearTimeout(clearEnvSwitch)
  }, [hasRecentlySwitched, setHasRecentlySwitchedEnv])

  const envOptions = useMemo(() => {
    let options = organization.environments.map(env => ({
      name: env.name,
      path: getOrgEnvSlug(env.slug, organization.slug),
      color: env.color,
      isCurrent:
        env.slug === envSlug ||
        ((env.slug === null || env.slug === PRODUCTION_ORG_ENV_SLUG) &&
          isProduction) ||
        (env.slug === DEVELOPMENT_ORG_ENV_SLUG && isDevMode),
    }))

    if (hasDevAccess) {
      if (!options.find(option => option.name === DEVELOPMENT_ORG_ENV_NAME)) {
        options.push({
          name: DEVELOPMENT_ORG_ENV_NAME,
          path: getOrgEnvSlug(DEVELOPMENT_ORG_ENV_SLUG, organization.slug),
          color: null,
          isCurrent: isDevMode,
        })
      }
    } else {
      options = options.filter(o => o.name !== DEVELOPMENT_ORG_ENV_NAME)
    }

    if (!options.find(option => option.name === PRODUCTION_ORG_ENV_NAME)) {
      options.unshift({
        name: PRODUCTION_ORG_ENV_NAME,
        path: getOrgEnvSlug(PRODUCTION_ORG_ENV_SLUG, organization.slug),
        color: null,
        isCurrent: isProduction,
      })
    }

    // Make sure production is first and development is last
    options.sort((a, b) => {
      if (a.name === PRODUCTION_ORG_ENV_NAME) return -1
      if (b.name === PRODUCTION_ORG_ENV_NAME) return 1

      if (a.name === DEVELOPMENT_ORG_ENV_NAME) return 1
      if (b.name === DEVELOPMENT_ORG_ENV_NAME) return -1
      return 0
    })

    return options
  }, [organization, isDevMode, isProduction, envSlug, hasDevAccess])

  const nonEnvPaths = [
    `/dashboard/${orgEnvSlug}/organization`,
    `/dashboard/${orgEnvSlug}/account`,
    `/dashboard/${orgEnvSlug}/new-organization`,
    `/dashboard/${orgEnvSlug}/develop/serverless-endpoints`,
    `/dashboard/${orgEnvSlug}/develop/keys`,
    `/dashboard/${orgEnvSlug}/transactions`,
  ]

  const isNonEnvPage =
    nonEnvPaths.filter(path => location.pathname.startsWith(path)).length > 0

  const currentEnvName =
    organization.environments.find(env => env.slug === envSlug)?.name ??
    (isDevMode ? DEVELOPMENT_ORG_ENV_NAME : PRODUCTION_ORG_ENV_NAME)

  const switchToEnvironment = useCallback(
    (envSlug: string | null) => {
      // DEVELOPMENT_ORG_ENV_SLUG and null are aliases; typically `path` will be whatever the actual path is
      let newSlug = envSlug
      if (envSlug === DEVELOPMENT_ORG_ENV_SLUG) {
        newSlug = `${orgSlug}/develop`
      } else if (!envSlug) {
        newSlug = orgSlug
      }

      setHasRecentlySwitchedEnv(true)
      const newPath = `/dashboard/${newSlug}/actions${
        actionSlug !== '' ? `/${actionSlug}` : ''
      }`
      navigate(newPath)
    },
    [orgSlug, navigate, actionSlug, setHasRecentlySwitchedEnv]
  )

  return {
    envOptions,
    currentEnvName,
    isNonEnvPage,
    switchToEnvironment,
  }
}
