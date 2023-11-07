import { Link } from 'react-router-dom'
import {
  Menu,
  useMenuState,
  MenuItem,
  MenuButton,
  MenuStateReturn,
} from 'reakit'
import classNames from 'classnames'
import IconCheck from '~/icons/compiled/Check'
import { useOrgSwitcher } from '~/utils/useOrgSwitcher'
import Transition from '../Transition'
import { dropdownMenuClassNames } from '~/components/DropdownMenu'
import { NAV_ITEM_HEIGHT } from '.'
import IconCaretDown from '~/icons/compiled/CaretDown'
import React from 'react'

function MenuHeader({ label }) {
  return (
    <h3 className="text-xs font-medium tracking-wider uppercase text-gray-800 pt-2 pb-1 px-2 leading-4 flex items-center">
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
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
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
        <IconCheck className="w-3 h-3 text-primary-500 mr-1 -ml-0.5" />
      )}
      <span className="block flex-1">{label}</span>
    </MenuItem>
  )
}

export default function OrgSwitcher() {
  const switcherState = useOrgSwitcher()

  const { me, organization: currentOrg, setOrg } = switcherState

  const menu = useMenuState({ animated: 250, gutter: -4 })

  const otherOrgs =
    me?.userOrganizationAccess.filter(
      access => access.organizationId !== currentOrg.id
    ) ?? []

  return (
    <div className="relative">
      <MenuButton
        {...menu}
        className="flex w-full items-center flex-1 group overflow-hidden px-1 md:pl-3 rounded-md focus:outline-none z-[21] -top-px relative mr-1"
        style={{ height: NAV_ITEM_HEIGHT }}
      >
        <div className="flex-1 text-left font-medium text-gray-700 relative top-px">
          <span className="flex items-center text-xl tracking-tight text-gray-900 font-semibold leading-6 whitespace-no-wrap transition-all duration-300 ease-in-out">
            <span className="block max-w-[220px] md:max-w-[250px] truncate">
              {currentOrg.name}
            </span>
            <IconCaretDown className="w-5 h-5 lg:w-4 lg:h-4 ml-0.5 text-gray-500 relative" />
          </span>
        </div>
      </MenuButton>
      <Menu
        {...menu}
        className="w-full z-20 focus:outline-none"
        tabIndex={0}
        aria-label="Organization"
      >
        <Transition show={menu.visible} {...dropdownMenuClassNames}>
          <div className="rounded-md bg-white border border-gray-200 focus:outline-none overflow-hidden shadow-dropdown p-1.5 w-[220px]">
            <div className="space-y-3">
              {otherOrgs.length > 0 && (
                <div>
                  <MenuHeader label="Switch to" />
                  <div className="">
                    {otherOrgs.map(({ organization }) => (
                      <div key={organization.id} className="flex items-center">
                        <MenuListItem
                          {...menu}
                          onClick={e => {
                            if (e.metaKey || e.ctrlKey) {
                              window.open(
                                `/dashboard/${organization.slug}/actions`
                              )
                              menu.hide()
                            } else {
                              setOrg(organization)
                            }
                          }}
                          label={organization.name}
                          isActive={currentOrg.id === organization.id}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <MenuItem
                {...menu}
                className="px-2 py-1.5 text-sm w-full font-semibold text-primary-500 flex items-center justify-between focus:outline-none focus:bg-gray-50 rounded-md"
                as={Link}
                to={`/dashboard/${currentOrg.slug}/new-organization`}
                onClick={menu.hide}
              >
                Create organization...
              </MenuItem>
            </div>
          </div>
        </Transition>
      </Menu>
    </div>
  )
}
