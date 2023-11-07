import classNames from 'classnames'
import React, { useEffect, useRef } from 'react'
import { MenuButton, useMenuState, Menu, MenuItem } from 'reakit'
import CaretDownIcon from '~/icons/compiled/CaretDown'
import IVSpinner from '~/components/IVSpinner'
import { reportsAsAppleDevice } from '~/utils/usePlatform'
import { useIsomorphicLink } from '~/utils/useIsomorphicLocation'

interface IVButtonOption {
  label: string
  onClick?: () => void
  disabled?: boolean
}

export interface IVButtonProps {
  htmlFor?: string
  href?: string
  absolute?: boolean
  newTab?: boolean
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
  disabled?: boolean
  loading?: boolean
  label?: React.ReactNode
  type?: 'button' | 'submit' | 'reset'
  theme?: 'primary' | 'secondary' | 'danger' | 'plain'
  condensed?: boolean
  className?: string
  id?: string
  tabIndex?: number
  autoFocus?: boolean
  title?: string
  reloadDocument?: boolean
  state?: Record<string, any>
  options?: IVButtonOption[]
  shortcutKey?: string
  'data-pw'?: string
}

export default function IVButton(props: IVButtonProps) {
  const {
    className = '',
    loading = false,
    disabled = false,
    type = 'button',
    theme = 'primary',
    condensed = false,
    tabIndex,
    autoFocus = false,
    onClick,
    title,
    reloadDocument,
    state,
    options: dropdownOptions,
  } = props

  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const linkRef = useRef<HTMLAnchorElement | null>(null)

  const Link = useIsomorphicLink()

  const dropdown = useMenuState({
    placement: 'bottom-end',
    gutter: 4,
  })

  useEffect(() => {
    if (autoFocus) {
      buttonRef.current?.focus() ?? linkRef.current?.focus()
    }
  }, [autoFocus])

  const hasDropdown = !!dropdownOptions?.length

  // we apply these to the button and the optional dropdown button
  const focusClassName =
    'focus-within:ring-offset-0 focus-within:ring-2 focus-within:outline-0 focus-within:outline-primary-500 focus-within:border-primary-500'

  const elementClassName = classNames(
    'inline-flex border border-inherit justify-center relative outline-none ring-0 text-sm text-center w-full h-full',
    focusClassName,
    {
      'text-white bg-primary-500': theme === 'primary',
      'hover:bg-primary-400': theme === 'primary' && !disabled,
      'bg-primary-200': theme === 'primary' && disabled && !loading,
      'bg-primary-500 hover:bg-primary-500': theme === 'primary' && loading,

      'text-gray-800': theme === 'secondary',
      'bg-white hover:bg-gray-100': theme === 'secondary' && !disabled,
      'bg-gray-100 opacity-75': theme === 'secondary' && disabled,

      'text-white bg-red-500 focus-within:ring-primary-200 focus-within:border-red-700':
        theme === 'danger',
      'hover:bg-red-400': theme === 'danger' && !disabled,
      'bg-red-200': theme === 'danger' && disabled && !loading,
      'bg-red-500 hover:bg-red-500': theme === 'danger' && loading,

      'cursor-pointer': !disabled && !loading,
      'cursor-default': disabled && !loading,
      'rounded-md': !hasDropdown,
      'rounded-l-md': hasDropdown,
      'px-4 py-2': !condensed,
      'px-3 py-1.5': condensed,
      'font-medium': theme !== 'plain',
    }
  )

  const labelClassName = classNames({
    'opacity-0 cursor-default': loading,
    'opacity-100': !loading,
  })

  const sharedProps = {
    tabIndex,
    title,
    id: props.id,
    className: elementClassName,
    state,
    'data-pw': props['data-pw'],
  }

  const innerContents = (
    <span
      data-keyboard-shortcut={
        props.shortcutKey
          ? `${reportsAsAppleDevice() ? '⌘' : 'Ctrl'}+${props.shortcutKey}`
          : undefined
      }
      className={classNames(
        labelClassName,
        props.shortcutKey &&
          `after:content-[attr(data-keyboard-shortcut)] after:font-normal after:opacity-70 after:pl-[5px] after:text-[11px] after:relative after:-top-px`
      )}
      children={props.label}
    />
  )

  return (
    <div
      className={classNames(
        // .btn doesn't apply any styles but we use it as a locator in tests
        'btn inline-flex relative',
        {
          // this element doesn't have a border, but these colors will be inherited by
          // the button's child elements
          'border-transparent': theme !== 'secondary',
          'border-gray-300': theme === 'secondary',
        },
        className
      )}
    >
      {props.href ? (
        props.absolute ? (
          <a
            {...sharedProps}
            target={props.newTab ? '_blank' : undefined}
            rel="noreferrer"
            href={props.href}
            ref={linkRef}
            onClick={disabled ? handleDisabledClick : undefined}
          >
            {innerContents}
          </a>
        ) : (
          <Link
            {...sharedProps}
            to={props.href}
            target={props.newTab ? '_blank' : undefined}
            rel="noreferrer"
            ref={linkRef}
            reloadDocument={reloadDocument}
            onClick={disabled ? handleDisabledClick : undefined}
          >
            {innerContents}
          </Link>
        )
      ) : props.htmlFor ? (
        <label {...sharedProps} htmlFor={props.htmlFor}>
          {innerContents}
        </label>
      ) : disabled ? (
        // The onmouseleave event isn't fired on disabled buttons, which interferes with tooltip behavior.
        <span {...sharedProps} role="button" aria-disabled>
          {innerContents}
        </span>
      ) : (
        <button
          {...sharedProps}
          type={type}
          disabled={disabled || loading}
          onClick={disabled ? handleDisabledClick : onClick}
          ref={buttonRef}
        >
          {innerContents}
        </button>
      )}
      <span
        className={classNames(
          'absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-[1]',
          {
            'text-white': theme === 'primary' || theme === 'danger',
            'text-gray-500': theme === 'secondary',
          }
        )}
      >
        <span
          className={classNames('transition-all duration-150 ease-in-out', {
            'opacity-0 scale-[0.5] invisible': !loading,
            'opacity-100 scale-100 delay-150 visible': loading,
          })}
        >
          <IVSpinner className="w-5 h-5" />
        </span>
      </span>
      {!!dropdownOptions?.length && (
        <>
          <MenuButton
            {...dropdown}
            className={classNames(
              'border border-inherit -ml-px px-1 rounded-r-md focus:z-[1]',
              {
                'bg-primary-500 hover:bg-primary-400 text-white':
                  theme === 'primary',
                'text-gray-500 bg-white hover:bg-gray-50':
                  theme === 'secondary',
              },
              focusClassName
            )}
          >
            <CaretDownIcon className="w-4" />
          </MenuButton>
          <Menu
            {...dropdown}
            aria-label="Options"
            className="shadow-sm z-10 bg-white border border-gray-300 rounded-md overflow-hidden focus:outline-none focus:ring-0"
          >
            {dropdownOptions.map((option, key) => (
              <MenuItem
                {...dropdown}
                key={key}
                as="button"
                onClick={option.onClick}
                className="block px-4 py-2 w-full leading-5 text-sm text-gray-500 hover:bg-gray-50 focus:bg-blue-50 focus:outline-none focus:ring-0 text-right"
              >
                {option.label}
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
    </div>
  )
}

function handleDisabledClick<T>(event: React.MouseEvent<T>) {
  event.preventDefault()
  event.stopPropagation()
}
