import {
  Menu,
  useMenuState,
  MenuItem,
  MenuButton,
  MenuStateReturn,
} from 'reakit'
import classNames from 'classnames'
import IVAvatar from '~/components/IVAvatar'
import IconChevronDown from '~/icons/compiled/ChevronDown'
import IconCheck from '~/icons/compiled/Check'
import { useEffect } from 'react'
import useEnvSwitcher from '~/utils/useOrgEnvSwitcher'
import { useOrganization } from '../DashboardContext'
import { useOrgParams } from '~/utils/organization'

function MenuHeader({ label }) {
  return (
    <h3 className="text-xs font-medium tracking-wider uppercase text-gray-400 pt-2 pb-1 px-2 leading-4 flex items-center">
      <span className="block flex-1">{label}</span>
    </h3>
  )
}

function MenuListItem({
  onClick,
  label,
  isActive,
  ...menu
}: MenuStateReturn & {
  onClick: () => void
  label: string
  isActive?: boolean
}) {
  return (
    <MenuItem
      {...menu}
      className={classNames(
        'px-2 py-1.5 text-sm w-full text-left truncate cursor-pointer flex items-center justify-start flex-1 focus:outline-none rounded-md focus:bg-gray-50 focus:text-gray-900 text-gray-700'
      )}
      onClick={onClick}
    >
      {isActive && (
        <IconCheck className="w-4 h-4 text-primary-500 mr-1 -ml-0.5" />
      )}
      <span className="block flex-1">{label}</span>
    </MenuItem>
  )
}

export function MobileEnvSwitcherButton(props: {
  onToggleSwitcher: (visible: boolean) => void
}) {
  const currentOrg = useOrganization()
  const { onToggleSwitcher } = props
  const menu = useMenuState({ animated: 200, gutter: -58 })
  const { envSlug, orgEnvSlug } = useOrgParams()

  const { envOptions, currentEnvName, switchToEnvironment } = useEnvSwitcher({
    organization: currentOrg,
    envSlug,
    orgEnvSlug,
  })

  useEffect(() => {
    onToggleSwitcher(menu.visible)
  }, [onToggleSwitcher, menu.visible])

  return (
    <div className="relative w-full">
      <div className="pt-1.5 px-1.5">
        <div className="relative">
          <MenuButton
            {...menu}
            className="flex w-full items-center flex-1 group overflow-hidden pl-2.5 pt-2.5 pb-2 rounded-md focus:outline-none z-[21] relative"
          >
            <div>
              <IVAvatar
                name={currentOrg.name}
                className="w-9 h-9"
                shape="roundrect"
              />
            </div>
            <div className="ml-3 flex-1 text-left font-medium text-gray-700 truncate">
              <span className="block leading-5">{currentOrg.name}</span>
              {currentEnvName && (
                <span className="block text-xs transition-colors duration-300 text-gray-400">
                  {currentEnvName}
                </span>
              )}
            </div>
            <div className="flex-none flex items-center justify-center pl-2 pr-[13px] -mt-1">
              <IconChevronDown
                className={classNames(
                  'w-5 h-5 lg:w-4 lg:h-4 text-gray-500 relative top-1 transition-opacity duration-150',
                  {
                    'opacity-0': menu.visible,
                  }
                )}
              />
            </div>
          </MenuButton>
          <Menu
            {...menu}
            className="w-full z-20 iv-org-switcher focus:outline-none"
            tabIndex={0}
            aria-label="Organization"
          >
            <div className="rounded-md bg-white border border-gray-200 focus:outline-none overflow-hidden shadow-dropdown pt-[52px] px-1.5 pb-1.5">
              <div className="space-y-3 pt-1">
                {envOptions.length > 1 && (
                  <div>
                    <MenuHeader label="Environments" />
                    {envOptions.map(env => (
                      <MenuListItem
                        {...menu}
                        key={env.path}
                        onClick={() => switchToEnvironment(env.path)}
                        label={env.name}
                        isActive={env.isCurrent}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Menu>
        </div>
      </div>
    </div>
  )
}

export default function MobileEnvSwitcher({
  onToggleSwitcher,
}: {
  onToggleSwitcher: (visible: boolean) => void
}) {
  return <MobileEnvSwitcherButton onToggleSwitcher={onToggleSwitcher} />
}
