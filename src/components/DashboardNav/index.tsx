import classNames from 'classnames'
import { NavLink, useLocation } from 'react-router-dom'
import { useOrgParams } from '~/utils/organization'
import ControlPanel from './ControlPanel'
import ModeSwitch from './ModeSwitch'
import { useTopNavState } from '~/utils/useDashboardStructure'
import { ActionGroupWithPossibleMetadata } from '~/utils/types'
import { useEffect, useRef, useState } from 'react'
import IconCaretDown from '~/icons/compiled/CaretDown'
import { Menu, MenuButton, useMenuState } from 'ariakit'
import Transition from '../Transition'
import { dropdownMenuClassNames } from '~/components/DropdownMenu'
import { useDebouncedCallback } from 'use-debounce'
import MobileNav from './MobileNav'
import IconMenu from '~/icons/compiled/Menu'
import useControlPanelNav from './useControlPanelNav'
import OrgSwitcher from './OrgSwitcher'
import useDashboard from '../DashboardContext'
import { ENV_COLOR_OPTIONS } from '~/utils/color'
import { VisualState, useKBar } from 'kbar'
import SearchIcon from '~/icons/compiled/Search'

export const NAV_ITEM_HEIGHT = 54
export const NAVBAR_HEIGHT = NAV_ITEM_HEIGHT + 1 // 1px border
const MORE_ITEM_WIDTH = 84

function getFittingNavItems(
  container: HTMLElement,
  topLevelGroups: ActionGroupWithPossibleMetadata[]
): ActionGroupWithPossibleMetadata[] {
  const spaceTarget = container.offsetWidth

  const items = Array.from(container.children)
  const sizes = items.map(li => li.getBoundingClientRect())

  let spaceUsed = 0

  const canFitAllItems =
    sizes.reduce((acc, size) => acc + size.width, 0) < spaceTarget

  if (canFitAllItems) return topLevelGroups

  return sizes.reduce((acc, size, index) => {
    if (spaceUsed + size.width + MORE_ITEM_WIDTH < spaceTarget) {
      spaceUsed += size.width
      // don't push the first item, which is 'Dashboard' and is not in topLevelGroups
      if (index > 0) {
        acc.push(topLevelGroups[index - 1])
      }
    }
    return acc
  }, [] as ActionGroupWithPossibleMetadata[])
}

export function getTopLevelGroups(data?: ActionGroupWithPossibleMetadata[]) {
  if (!data) return []

  const topLevelGroups = data.filter(g => !g.slug.includes('/') && !g.unlisted)

  return topLevelGroups
}

export function useIsSettingsPage() {
  const { pathname } = useLocation()
  const { orgNav, userNav, actionsNav } = useControlPanelNav()

  const paths = [
    ...orgNav.map(g => g.path),
    ...userNav.map(g => g.path),
    ...actionsNav.map(g => g.path),
  ]

  return paths.some(p => pathname.startsWith(p))
}

function Navbar({
  groups,
  isSettingsPage,
}: {
  groups?: ActionGroupWithPossibleMetadata[]
  isSettingsPage: boolean
}) {
  const { basePath } = useOrgParams()

  // To avoid getting stuck in a display-adjust-display loop, we use two elements, a "ghost nav"
  // and a visible nav. The ghost nav calculates what we can fit on screen, and the visible nav renders it.
  const ghostNavRef = useRef<HTMLUListElement>(null)
  const [visibleItems, setVisibleItems] = useState<
    ActionGroupWithPossibleMetadata[] | undefined
  >(undefined)

  const menu = useMenuState({ animated: 250, gutter: -6 })

  const topLevelGroups = getTopLevelGroups(groups)

  const navLinkClassName = ({
    isActive,
    className,
  }: {
    isActive: boolean
    className?: string
  }) => {
    return classNames(
      'text-sm cursor-pointer flex items-center focus:outline-none font-medium px-4 rounded-md',
      className,
      {
        'bg-opacity-50 text-primary-400 border-none': isActive,
        'text-gray-900 hover:text-opacity-60 border-none': !isActive,
      }
    )
  }

  const calculate = useDebouncedCallback(() => {
    if (!ghostNavRef.current) return
    if (!topLevelGroups.length) {
      setVisibleItems([])
    } else {
      setVisibleItems(getFittingNavItems(ghostNavRef.current, topLevelGroups))
    }
  }, 100)

  useEffect(() => {
    calculate()
    window.addEventListener('resize', calculate)
    return () => window.removeEventListener('resize', calculate)
  }, [calculate, groups])

  return (
    <nav className="-mx-0.5 relative flex-1 hidden md:block">
      {isSettingsPage && (
        <ul className="flex items-center flex-wrap justify-start text-sm overflow-hidden">
          <li>
            <NavLink
              to={basePath}
              className="text-sm cursor-pointer px-4 text-primary-500 hover:opacity-70 flex items-center font-medium"
              style={{ height: NAV_ITEM_HEIGHT }}
            >
              Return to app &rsaquo;
            </NavLink>
          </li>
        </ul>
      )}

      {['ghost-nav', 'visible-nav'].map(nav => {
        const navItems = nav === 'ghost-nav' ? topLevelGroups : visibleItems
        const visibleSlugs = visibleItems?.map(g => g.slug) || []
        const hiddenItems = topLevelGroups.filter(
          g => !visibleSlugs.includes(g.slug)
        )
        const hasHiddenItems = !!visibleItems?.length && hiddenItems.length > 0

        return (
          <ul
            id={nav === 'ghost-nav' ? undefined : 'desktop-nav'}
            key={nav}
            className={classNames(
              'flex items-center flex-wrap justify-start text-sm overflow-hidden',
              {
                'invisible absolute top-0 left-0 w-full': nav === 'ghost-nav',
                hidden: isSettingsPage,
              }
            )}
            style={{ height: NAV_ITEM_HEIGHT }}
            ref={nav === 'ghost-nav' ? ghostNavRef : undefined}
          >
            <li>
              <NavLink
                to={basePath}
                className={navLinkClassName}
                style={{ height: NAV_ITEM_HEIGHT }}
                end
              >
                Dashboard
              </NavLink>
            </li>
            {navItems?.map(group => (
              <li key={group.slug} data-key={group.slug}>
                <NavLink
                  to={`${basePath}/${group.slug}`}
                  className={navLinkClassName}
                  style={{ height: NAV_ITEM_HEIGHT }}
                >
                  {group.name}
                </NavLink>
              </li>
            ))}
            {nav === 'visible-nav' && hasHiddenItems && (
              <li>
                <MenuButton
                  state={menu}
                  className={navLinkClassName({ isActive: false })}
                  style={{ height: NAV_ITEM_HEIGHT }}
                >
                  More
                  <IconCaretDown className="w-3 h-3 ml-1" />
                </MenuButton>
                <Menu state={menu}>
                  <Transition show={menu.open} {...dropdownMenuClassNames}>
                    <ul className="bg-white border border-gray-200 rounded-md shadow-md py-2 min-w-[120px] focus:outline-none">
                      {hiddenItems.map(group => {
                        return (
                          <NavLink
                            key={group.slug}
                            to={`${basePath}/${group.slug}`}
                            className={({ isActive }) =>
                              navLinkClassName({
                                isActive,
                                className: 'py-1.5',
                              })
                            }
                            onClick={() => menu.hide()}
                          >
                            {group.name}
                          </NavLink>
                        )
                      })}
                    </ul>
                  </Transition>
                </Menu>
              </li>
            )}
          </ul>
        )
      })}
    </nav>
  )
}

function CommandBarToggle() {
  const { query, visible } = useKBar(state => ({
    visible: state.visualState !== VisualState.hidden,
  }))

  return (
    <button
      data-pw-command-bar-toggle
      onClick={query.toggle}
      className={classNames(
        'p-1 focus:outline-none w-8 h-8 rounded-md flex items-center justify-center',
        {
          'bg-primary-500 text-white': visible,
          'text-gray-600 hover:text-gray-500 transition-colors duration-150':
            !visible,
        }
      )}
    >
      <SearchIcon className="w-4 h-4" strokeWidth={2.5} />
    </button>
  )
}

export default function DashboardNav() {
  const { isDevMode } = useOrgParams()
  const { organizationEnvironment } = useDashboard()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const groups = useTopNavState({
    mode: isDevMode ? 'console' : 'live',
  })

  const isSettingsPage = useIsSettingsPage()

  const hasEnvColor = !!organizationEnvironment?.color

  return (
    <>
      <MobileNav
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        groups={groups}
        mode={isDevMode ? 'console' : 'live'}
      />
      <div className="z-20" style={{ gridArea: 'navbar' }}>
        {organizationEnvironment?.color && !isSettingsPage && (
          <div
            className="h-6 w-full text-xs font-medium text-white flex items-center px-5 absolute top-0 left-0"
            style={{
              background: ENV_COLOR_OPTIONS[organizationEnvironment.color],
            }}
          >
            {organizationEnvironment?.name}
          </div>
        )}
        <div
          className={classNames(
            'bg-white md:pl-2 flex items-start justify-between border-b border-gray-200 relative',
            {
              'mt-6': !isSettingsPage && hasEnvColor,
            }
          )}
          style={{
            height: NAV_ITEM_HEIGHT + 1,
          }}
        >
          <div className="flex items-start flex-1">
            <button
              type="button"
              className="w-10 flex items-center justify-center text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-0 md:hidden"
              style={{ height: NAV_ITEM_HEIGHT }}
              onClick={() => setIsSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <IconMenu className="w-4 h-4" aria-hidden="true" />
            </button>
            <OrgSwitcher />
            <Navbar groups={groups} isSettingsPage={isSettingsPage} />
          </div>
          <div
            className="flex items-center space-x-2 md:space-x-2 flex-none pr-2"
            style={{ height: NAV_ITEM_HEIGHT }}
          >
            <div className="hidden sm:block">
              <ModeSwitch />
            </div>
            <CommandBarToggle />
            <ControlPanel />
          </div>
        </div>
      </div>
    </>
  )
}
