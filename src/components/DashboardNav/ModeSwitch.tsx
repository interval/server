import React, { useEffect, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Menu, MenuButton, MenuItem, useMenuState } from 'reakit'
import classNames from 'classnames'
import { useOrgParams } from '~/utils/organization'
import { useRecoilState } from 'recoil'
import { consoleUIState } from '../Console'
import useDashboard, { useHasPermission } from '../DashboardContext'
import Transition from '../Transition'
import { dropdownMenuClassNames } from '~/components/DropdownMenu'
import useCopyToClipboard from '~/utils/useCopyToClipboard'
import { trpc } from '~/utils/trpc'
import IconClipboard from '~/icons/compiled/Clipboard'
import { notify } from '~/components/NotificationCenter'
import { UI_STATE } from '~/components/TransactionUI/useTransaction'
import {
  DEVELOPMENT_ORG_ENV_NAME,
  DEVELOPMENT_ORG_ENV_SLUG,
} from '~/utils/environments'
import IconChevronDown from '~/icons/compiled/ChevronDown'
import SettingsIcon from '~/icons/compiled/Settings'
import useEnvSwitcher from '~/utils/useOrgEnvSwitcher'
import EnvironmentColor from '~/components/EnvironmentColor'
import { useDebounce } from 'use-debounce'
import IVSpinner from '~/components/IVSpinner'

function ApiKeyButton({ apiKey }: { apiKey: string }) {
  const { isCopied, onCopyClick } = useCopyToClipboard()

  useEffect(() => {
    if (isCopied) {
      notify.success('Copied token to clipboard')
    }
  }, [isCopied])

  return (
    <button
      onClick={() => onCopyClick(apiKey)}
      className="font-mono flex items-center appearance-none px-0 focus:outline-none justify-start text-left text-gray-500 hover:opacity-70"
    >
      <span className="w-[194px] text-[12px] truncate">{apiKey}</span>
      <IconClipboard className="w-4 h-4 text-gray-500 ml-1" />
    </button>
  )
}

function ConnectionIndicator({ state }: { state: UI_STATE | null }) {
  return (
    <span
      className={classNames('inline-block w-1.5 h-1.5 rounded-full', {
        'bg-green-600':
          state === 'COMPLETED' ||
          state === 'USURPED' ||
          state === 'IN_PROGRESS',
        'bg-red-600': state === 'HOST_NOT_FOUND' || state === 'SERVER_DROPPED',
        'bg-gray-400': state === 'IDLE',
      })}
    ></span>
  )
}

function ConnectionStatus({ state }: { state: UI_STATE }) {
  if (state === 'CONNECTING' || state === 'HOST_DROPPED') {
    return <IVSpinner className="w-3 h-3 text-gray-500 ml-1" />
  }

  if (
    state === 'COMPLETED' ||
    state === 'USURPED' || // usurped is still online
    state === 'IN_PROGRESS'
  ) {
    return <span className="text-green-600">Online</span>
  }

  if (
    state === 'HOST_NOT_FOUND' ||
    state === 'SERVER_DROPPED' ||
    state === 'IDLE'
  ) {
    return <span>Offline</span>
  }

  return <></>
}

export default function ModeSwitch() {
  const { orgEnvSlug, envSlug, isDevMode, orgSlug } = useOrgParams<{
    '*': string
  }>()
  const { organization } = useDashboard()
  const [hostState] = useRecoilState(consoleUIState)
  const canAccessEnvironments = useHasPermission('ACCESS_ORG_ENVIRONMENTS')
  const canUpdateEnvironments = useHasPermission('WRITE_ORG_SETTINGS')

  const { currentEnvName, envOptions, switchToEnvironment, isNonEnvPage } =
    useEnvSwitcher({
      organization,
      orgEnvSlug,
      envSlug,
    })

  // we use this data when the user is in live mode.
  // when in dev mode, we use the websocket connection's status from consoleUIState.
  const status = trpc.useQuery(['dashboard.dev-host-status'])

  const derivedStatus = useMemo<UI_STATE>(() => {
    if (isDevMode) {
      if (
        hostState === 'COMPLETED' ||
        hostState === 'USURPED' ||
        hostState === 'IN_PROGRESS'
      ) {
        return 'IN_PROGRESS'
      }
      if (hostState === 'HOST_NOT_FOUND' || hostState === 'SERVER_DROPPED') {
        return 'SERVER_DROPPED'
      }
      if (hostState === 'HOST_DROPPED') {
        return 'HOST_DROPPED'
      }
      return 'IDLE'
    }

    if (status?.data?.hasOnlineDevHost) {
      return 'IN_PROGRESS'
    }

    return 'IDLE'
  }, [isDevMode, hostState, status.data])

  const menu = useMenuState({
    animated: 250,
    gutter: 4,
    placement: 'bottom-end',
  })

  const currentItemRef = useRef<HTMLAnchorElement>(null)
  useEffect(() => {
    if (menu.visible) {
      currentItemRef.current?.focus()
    }
  }, [menu.visible])

  const onMenuButtonClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      // hold down meta key to automatically toggle between prod & dev
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault()
        switchToEnvironment(
          currentEnvName === DEVELOPMENT_ORG_ENV_NAME
            ? null
            : DEVELOPMENT_ORG_ENV_SLUG
        )
      }
    },
    [currentEnvName, switchToEnvironment]
  )

  // wait until menu is hidden before showing dev host status + key
  const [debounced_isDevMode] = useDebounce(isDevMode, 250)

  if (envOptions.length <= 1) return null
  if (!canAccessEnvironments) return null
  if (isNonEnvPage) return null

  return (
    <div>
      <MenuButton
        {...menu}
        onClick={onMenuButtonClick}
        className={classNames(
          'px-2 focus:outline-none text-[13px] h-7 rounded-md flex items-center justify-center hover:bg-gray-100 space-x-1.5',
          {
            'text-gray-700 bg-gray-100': menu.visible,
            'text-gray-600 hover:text-gray-700 transition-colors duration-150':
              !menu.visible,
          }
        )}
      >
        {isDevMode && <ConnectionIndicator state={derivedStatus} />}
        <span>{currentEnvName}</span>
        <IconChevronDown className="w-2.5 h-2.5" />
      </MenuButton>
      <Menu {...menu} className="focus:outline-none relative z-40">
        <Transition show={menu.visible} {...dropdownMenuClassNames}>
          <div
            data-pw="dropdown-menu"
            onClick={e => e.stopPropagation()}
            className="bg-white shadow-dropdown rounded-lg border border-[#D9DEEF] focus:outline-none text-[13px] overflow-hidden w-[270px] pb-1"
          >
            <div className="px-1.5 pt-3.5 pb-2">
              <div className="flex items-center justify-between mb-2 pl-2.5 pr-2">
                <h4 className="text-xs font-semibold tracking-wider uppercase text-gray-900 leading-4">
                  Environments
                </h4>
                {canUpdateEnvironments && (
                  <Link
                    to={`/dashboard/${orgSlug}/organization/environments`}
                    className="block pl-2 text-gray-500 hover:text-primary-500"
                    onClick={menu.hide}
                  >
                    <SettingsIcon className="w-3 h-3" />
                  </Link>
                )}
              </div>
              <div className="space-y-0.5">
                {envOptions.map(env => (
                  <MenuItem
                    {...menu}
                    key={env.path}
                    as={Link}
                    to={env.path}
                    onClick={e => {
                      e.preventDefault()
                      menu.hide()
                      switchToEnvironment(env.path)
                    }}
                    ref={env.isCurrent ? currentItemRef : undefined}
                    className={classNames(
                      'px-2.5 py-1.5 text-sm w-full flex items-center justify-between focus:outline-none rounded-md',
                      {
                        'bg-primary-50 bg-opacity-50 text-primary-500 font-medium':
                          env.isCurrent,
                        'text-gray-700 focus:bg-gray-50 hover:bg-gray-50':
                          !env.isCurrent,
                      }
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <EnvironmentColor color={env.color} size="sm" />
                      <span>{env.name}</span>
                    </span>
                    {env.name === DEVELOPMENT_ORG_ENV_NAME && (
                      <span className="text-[10px] tracking-wider text-gray-500 uppercase font-medium">
                        <ConnectionStatus state={derivedStatus} />
                      </span>
                    )}
                  </MenuItem>
                ))}
              </div>
            </div>

            {debounced_isDevMode && (
              <div className="mx-4 pt-3 pb-2 border-t border-gray-200">
                <p className="text-gray-900 font-medium mb-0.5">
                  Personal development key:
                </p>
                <ApiKeyButton apiKey={status.data?.devApiKey ?? ''} />
                <p className="text-xs leading-normal mt-2.5 text-gray-500">
                  The Development environment is unique to your user account.{' '}
                  <a
                    href="https://interval.com/docs/concepts/console"
                    className="font-medium text-primary-500 hover:opacity-70"
                  >
                    Learn more &rsaquo;
                  </a>
                </p>
              </div>
            )}
          </div>
        </Transition>
      </Menu>
    </div>
  )
}
