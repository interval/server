import { useIsomorphicLink } from '~/utils/useIsomorphicLocation'
import { getCurrentPath } from '~/utils/url'
import classNames from 'classnames'
import {
  Menu,
  MenuButton,
  MenuInitialState,
  MenuItem,
  MenuItemProps,
  MenuStateReturn,
  useMenuState,
} from 'reakit'

export const dropdownMenuClassNames = {
  enter: 'transition-all ease-in-menu duration-200',
  enterFrom: 'scale-95 opacity-0',
  enterTo: 'scale-100 opacity-100',
  leave: 'transition-all ease-in duration-200',
  leaveFrom: 'scale-100 opacity-100',
  leaveTo: 'scale-95 opacity-0',
}

export type DropdownMenuItemProps = {
  label: string | React.ReactElement
  disabled?: boolean
  theme?: 'default' | 'danger'
  onClick?: () => void
  url?: string
  newTab?: boolean
  path?: string
}

type DropdownMenuProps = {
  children: React.ReactElement
  options: DropdownMenuItemProps[]
  disabled?: boolean
  buttonClassName?: string
  menuClassName?: string
  title: string
} & Pick<MenuInitialState, 'placement' | 'modal'>

export function DropdownMenuItem(
  props: DropdownMenuItemProps & {
    menu: MenuStateReturn
  }
) {
  const { theme = 'default' } = props
  const Link = useIsomorphicLink()

  const shared: MenuItemProps = {
    ...props.menu,
    disabled: props.disabled,
    className: classNames(
      'text-sm block w-full text-left px-3 py-1.5 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none',
      {
        'text-gray-600 hover:text-gray-800 focus:text-gray-800':
          theme === 'default',
        'text-red-600': theme === 'danger' && !props.disabled,
        'text-gray-600 text-opacity-60': props.disabled,
      }
    ),
  }

  const path = props.path
  if (path) {
    // prevents a loading state flash on ActionsPage while we check if the action exists
    const title = props.path?.split('?')[0] ?? props.label

    return (
      // @ts-ignore: This is correct according to their docs but their types aren't right
      // For some reason using `as` doesn't work with the state prop
      <MenuItem {...shared}>
        {innerProps => (
          <Link
            to={path}
            state={{
              title,
              backPath: getCurrentPath(),
            }}
            {...innerProps}
          >
            {props.label}
          </Link>
        )}
      </MenuItem>
    )
  }

  if (props.onClick) {
    return (
      <MenuItem
        {...shared}
        type="button"
        onClick={() => {
          if (props.onClick) props.onClick()
          props.menu.hide()
        }}
        children={props.label}
      />
    )
  }

  if (props.url) {
    return (
      <MenuItem
        {...shared}
        as="a"
        href={props.url}
        target={props.newTab ? '_blank' : undefined}
        children={props.label}
      />
    )
  }

  return <MenuItem {...shared} type="button" disabled children={props.label} />
}

export default function DropdownMenu(props: DropdownMenuProps) {
  const menu = useMenuState({
    placement: props.placement ?? 'auto-end',
    modal: props.modal,
    gutter: 2,
  })

  return (
    <>
      <MenuButton
        {...menu}
        type="button"
        className={classNames(
          menu.visible ? 'text-primary-500' : '',
          props.buttonClassName
        )}
        disabled={props.disabled}
        onClick={e => {
          // prevents triggering click event on parent element(s), e.g. table rows
          e.stopPropagation()
        }}
      >
        <span className="sr-only">Open options</span>
        {props.children}
      </MenuButton>
      <Menu
        {...menu}
        className={classNames(
          'relative z-10 focus:outline-none',
          props.menuClassName
        )}
        aria-label={props.title}
      >
        <div
          data-pw="dropdown-menu"
          onClick={e => {
            e.stopPropagation()
          }}
          className="bg-white py-1 shadow-dropdown rounded-lg border border-[#D9DEEF] focus:outline-none"
        >
          {props.options.map((opt, idx) => (
            <DropdownMenuItem key={idx} menu={menu} {...opt} />
          ))}
        </div>
      </Menu>
    </>
  )
}
