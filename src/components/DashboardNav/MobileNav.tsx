import classNames from 'classnames'
import { Link, NavLink } from 'react-router-dom'
import { logout } from '~/utils/auth'
import Transition from '../Transition'
import IVAvatar from '../IVAvatar'
import useDashboard from '../DashboardContext'
import IconCancel from '~/icons/compiled/Cancel'
import IconSettings from '~/icons/compiled/Settings'
import { useOrgParams } from '~/utils/organization'
import { useState } from 'react'
import { getNavHref } from '~/utils/navigation'
import { ActionGroupWithPossibleMetadata, ActionMode } from '~/utils/types'
import { getTopLevelGroups } from '.'
import MobileEnvSwitcher from '../Sidebar/OrgSwitcher'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  groups?: ActionGroupWithPossibleMetadata[]
  mode: ActionMode
}

function Backdrop(props: MobileMenuProps) {
  return (
    <Transition
      show={props.isOpen}
      enter="transition-opacity ease-linear duration-300"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="transition-opacity ease-linear duration-300"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div
        className="fixed inset-0 bg-gray-600 bg-opacity-75"
        onClick={props.onClose}
      ></div>
    </Transition>
  )
}

function CloseButton(props: MobileMenuProps) {
  return (
    <Transition
      show={props.isOpen}
      enter="ease-in-out duration-300"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="ease-in-out duration-300"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className="absolute top-0 right-0 pt-2 -mr-12">
        <button
          type="button"
          className="flex items-center justify-center w-10 h-10 ml-1 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
          onClick={props.onClose}
        >
          <span className="sr-only">Close sidebar</span>
          <IconCancel className="w-6 h-6 text-white" aria-hidden="true" />
        </button>
      </div>
    </Transition>
  )
}

export default function MobileNav(props: MobileMenuProps) {
  const { isOpen, onClose } = props
  const { orgEnvSlug, basePath } = useOrgParams()
  const [isSwitcherVisible, setIsSwitcherVisible] = useState(false)
  const { me } = useDashboard()

  const topLevelGroups = getTopLevelGroups(props.groups)

  const navLinkClassName = ({
    isActive,
    className,
  }: {
    isActive: boolean
    className?: string
  }) => {
    return classNames(
      'text-base cursor-pointer flex items-center focus:outline-none font-medium px-4 py-2.5 rounded-md',
      className,
      {
        'bg-opacity-50 text-primary-400 border-none': isActive,
        'text-gray-900 hover:text-opacity-60 border-none': !isActive,
      }
    )
  }

  return (
    <div className={!isOpen ? 'pointer-events-none' : ''}>
      <div className="fixed inset-0 z-40 flex md:hidden">
        <Backdrop {...props} />
        {/* TODO: the "in" transition doesn't work here, can't figure out why. */}
        <Transition
          show={isOpen}
          enter="transition ease-in-out duration-300 transform"
          enterFrom="-translate-x-full"
          enterTo="translate-x-0"
          leave="transition ease-in-out duration-300 transform"
          leaveFrom="translate-x-0"
          leaveTo="-translate-x-full"
        >
          <div className="relative flex flex-col flex-1 w-full max-w-xs bg-white max-h-screen">
            <CloseButton {...props} />
            <div className="flex-none pb-2">
              <MobileEnvSwitcher onToggleSwitcher={setIsSwitcherVisible} />
            </div>
            <div className="flex-1 flex flex-col overflow-y-auto border-t border-gray-200">
              <nav
                className={classNames(
                  'flex-1 transition-opacity duration-200 pt-1 pb-2',
                  {
                    'opacity-50': isSwitcherVisible,
                  }
                )}
              >
                <ul>
                  <li>
                    <NavLink to={basePath} className={navLinkClassName} end>
                      Dashboard
                    </NavLink>
                  </li>
                  {topLevelGroups.map(group => (
                    <li key={group.slug} data-key={group.slug}>
                      <NavLink
                        to={`${basePath}/${group.slug}`}
                        className={navLinkClassName}
                        onClick={onClose}
                      >
                        {group.name}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={async () => {
                    await logout()
                    onClose()
                    window.location.assign('/')
                  }}
                  className={navLinkClassName({ isActive: false })}
                >
                  Log out
                </button>
              </div>
            </div>
            <Link
              to={getNavHref(orgEnvSlug, '/account')}
              className="flex items-center p-4 border-t border-gray-200"
              onClick={onClose}
            >
              <div>
                <IVAvatar
                  name={[me?.firstName, me?.lastName].filter(Boolean).join(' ')}
                  className="w-9 h-9"
                />
              </div>
              <div className="ml-3 flex-1 overflow-hidden">
                <div className="text-sm font-medium text-gray-700 truncate">
                  {me?.firstName} {me?.lastName}
                </div>
                <span className="block text-xs text-gray-500 truncate">
                  {me?.email}
                </span>
              </div>
              <div className="flex-none">
                <IconSettings
                  className="w-5 h-5 text-gray-400"
                  aria-hidden="true"
                />
              </div>
            </Link>
          </div>
        </Transition>
        <div className="flex-shrink-0 w-14">
          {/* Force sidebar to shrink to fit close icon */}
        </div>
      </div>
    </div>
  )
}
