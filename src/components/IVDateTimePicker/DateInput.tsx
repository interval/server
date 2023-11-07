import React, { ChangeEvent } from 'react'

export const DateInput = React.forwardRef<
  HTMLInputElement,
  {
    id?: string
    value?: string
    disabled?: boolean
    className?: string
    onChange: (value: string) => void
    onBlur?: React.FocusEventHandler<HTMLInputElement>
    onFocus?: React.FocusEventHandler<HTMLInputElement>
    onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
    showPlaceholder?: boolean
  }
>((props, ref) => {
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    let value = event.currentTarget.value

    value = value.replace(/[^0-9/]/, '')
    value = value.replace(/\/+/, '/')
    value = value.slice(0, 10)

    props.onChange(value)
  }

  const showPlaceholder = props.showPlaceholder ?? true

  return (
    <div className="relative">
      <input
        ref={ref}
        id={props.id}
        disabled={props.disabled}
        value={props.value ?? ''}
        type="text"
        className="bg-transparent w-full focus:outline-none disabled:bg-transparent disabled:text-fill-gray-700"
        onChange={onChange}
        onFocus={props.onFocus}
        onBlur={props.onBlur}
        onKeyDown={props.onKeyDown}
      />
      {showPlaceholder && <Placeholder value={props.value ?? ''} />}
    </div>
  )
})
DateInput.displayName = 'DateInput'

function Placeholder({ value }: { value: string }) {
  const ph = ['MM', 'DD', 'YYYY']

  const parts = value.split('/')

  if (parts[0]) {
    if (parts[0][0] !== '0' && parts[0][0] !== '1') {
      ph[0] = 'M'
    } else if (parts[0][0] === '1' && parts[0].length < 2 && parts.length > 1) {
      ph[0] = 'M'
    }
    if (parts[0].length >= 2) {
      ph[0] = Array.from(new Array(parts[0].length)).fill('M').join('')
    }
  }

  if (parts.length === 3 && parts[1].length === 1) {
    ph[1] = 'D'
  }

  if (parts[1] && parts[1].length > 2) {
    ph[1] = Array.from(new Array(parts[1].length)).fill('D').join('')
  }

  return (
    <span className="absolute inset-0 text-gray-400 pointer-events-none">
      <span className="invisible">{value}</span>
      {ph.join('/').slice(value.length)}
    </span>
  )
}
