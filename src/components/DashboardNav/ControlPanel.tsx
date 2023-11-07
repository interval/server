import classNames from 'classnames'
import { Link } from 'react-router-dom'
import {
  MenuButton,
  Menu,
  useMenuState,
  MenuItem as ReakitMenuItem,
} from 'reakit'
import SettingsIcon from '~/icons/compiled/Settings'
import useDashboard from '../DashboardContext'
import Transition from '../Transition'
import { dropdownMenuClassNames } from '~/components/DropdownMenu'
import { logout } from '~/utils/auth'
import useControlPanelNav, { ControlPanelMenuItem } from './useControlPanelNav'
import IVAvatar from '../IVAvatar'
import { logger } from '~/utils/logger'

function MenuItem({
  menu,
  isCurrentPage,
  path,
  name,
  onClick,
  spaceAbove,
}: {
  menu: ReturnType<typeof useMenuState>
  path?: string
  name: string
  isCurrentPage?: boolean
  spaceAbove?: boolean
  onClick?: () => void
}) {
  const baseClassName = classNames(
    'group flex items-center w-full py-1 text-gray-600 hover:text-opacity-60 focus:text-opacity-60 text-left focus:outline-none',
    {
      'mt-4': spaceAbove,
    }
  )

  if (path?.endsWith('/logout')) {
    return (
      <ReakitMenuItem
        {...menu}
        as="button"
        type="button"
        className={baseClassName}
        onClick={() => {
          logout()
            .then(() => window.location.assign('/'))
            .catch(error => {
              logger.error('Error logging user out', { error })
            })
        }}
      >
        {name}
      </ReakitMenuItem>
    )
  }

  if (onClick) {
    return (
      <ReakitMenuItem
        {...menu}
        as="button"
        type="button"
        className={baseClassName}
        onClick={onClick}
      >
        {name}
      </ReakitMenuItem>
    )
  }

  return (
    <ReakitMenuItem
      {...menu}
      as={Link}
      to={path ?? '#'}
      className={classNames(baseClassName, {
        'text-primary-500 font-medium': isCurrentPage,
      })}
      onClick={() => menu.hide()}
    >
      {name}
    </ReakitMenuItem>
  )
}

function MenuGroup({
  title,
  items,
  menu,
}: {
  title: string
  items: ControlPanelMenuItem[]
  menu: ReturnType<typeof useMenuState>
}) {
  return (
    <div>
      <h4 className="text-xs font-medium tracking-wider uppercase text-gray-800 pt-2 pb-1 leading-4 flex items-center">
        {title}
      </h4>
      {items.map(item => (
        <MenuItem menu={menu} key={item.path} {...item} />
      ))}
    </div>
  )
}

function Footer() {
  return (
    <>
      <a
        href="https://interval.com/docs"
        className="group block bg-gray-50 p-4 text-gray-500"
      >
        <strong className="text-gray-900 font-medium group-hover:text-opacity-70">
          Documentation
        </strong>
        <br />
        Visit the Interval docs &rsaquo;
      </a>
    </>
  )
}

export default function ControlPanel() {
  const { me } = useDashboard()
  const menu = useMenuState({
    animated: 250,
    modal: true,
    gutter: 4,
    placement: 'bottom-end',
  })

  const { orgNav, actionsNav, userNav } = useControlPanelNav()

  return (
    <div>
      <MenuButton
        {...menu}
        data-pw-nav-control-panel-toggle
        className={classNames(
          'p-1 focus:outline-none w-8 h-8 rounded-md flex items-center justify-center',
          {
            'bg-primary-500 text-white': menu.visible,
            'text-gray-600 hover:text-gray-500 transition-colors duration-150':
              !menu.visible,
          }
        )}
      >
        <SettingsIcon className="w-4 h-4" />
      </MenuButton>

      <Menu
        {...menu}
        className="focus:outline-none relative z-40 w-full px-2 sm:w-auto sm:px-0"
      >
        <Transition show={menu.visible} {...dropdownMenuClassNames}>
          <div
            data-pw="dropdown-menu"
            onClick={e => e.stopPropagation()}
            className="bg-white shadow-dropdown rounded-lg border border-[#D9DEEF] focus:outline-none text-[13px] overflow-hidden"
          >
            <div
              className={classNames(
                'grid grid-cols-2 sm:grid-cols-[220px_200px] transition-opacity duration-200'
              )}
            >
              <div className="p-4 pb-1 flex items-center col-span-2">
                <div>
                  <IVAvatar
                    name={[me?.firstName, me?.lastName]
                      .filter(Boolean)
                      .join(' ')}
                    className="w-9 h-9"
                  />
                </div>
                <div className="ml-2 flex-1 overflow-hidden">
                  <div className="text-sm font-medium text-gray-700 truncate">
                    {me?.firstName} {me?.lastName}
                  </div>
                  <span className="text-xs text-gray-500 truncate block">
                    {me?.email}
                  </span>
                </div>
              </div>

              {me.isEmailConfirmationRequired && (
                <div className="col-span-2 pt-2">
                  <div className="bg-blue-50 px-4 py-3 text-sm text-gray-700">
                    <Link
                      to="/confirm-email"
                      className="font-medium text-primary-500 hover:opacity-60"
                    >
                      Confirm your email
                    </Link>{' '}
                    to create and deploy live actions.
                  </div>
                </div>
              )}
              {orgNav.length > 0 ? (
                <>
                  <div className="p-4">
                    <MenuGroup
                      title="Organization"
                      items={orgNav}
                      menu={menu}
                    />
                  </div>

                  <div className="p-4">
                    <MenuGroup title="Actions" items={actionsNav} menu={menu} />
                    <div className="py-1 -mt-px">&nbsp;</div>
                    <MenuGroup title="Account" items={userNav} menu={menu} />
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4">
                    <MenuGroup title="Actions" items={actionsNav} menu={menu} />
                  </div>
                  <div className="p-4">
                    <MenuGroup title="Account" items={userNav} menu={menu} />
                  </div>
                </>
              )}

              <Footer />
            </div>
          </div>
        </Transition>
      </Menu>
    </div>
  )
}
