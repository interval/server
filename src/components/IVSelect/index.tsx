import classNames from 'classnames'
import { SelectHTMLAttributes } from 'react'
import { getShortcuts, ShortcutMap } from '~/utils/usePlatform'
import { preventDefaultInputEnterKey } from '~/utils/preventDefaultInputEnter'

export interface IVSelectOption {
  value: string
  label: string
  disabled?: boolean
  shortcuts?: string | ShortcutMap
}

export interface IVSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: IVSelectOption[]
  defaultLabel?: string
}

export default function IVSelect(props: IVSelectProps) {
  const { className, options, defaultLabel = '', ...rest } = props

  return (
    <select
      onKeyDown={preventDefaultInputEnterKey}
      className={classNames('form-select', props.className, {
        'text-gray-400': !props.value && !!props.defaultLabel,
      })}
      {...rest}
      id={props.id ?? props.name}
    >
      {defaultLabel && <option value="">{defaultLabel}</option>}
      {options.map(option => (
        <option
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          aria-keyshortcuts={getShortcuts(option.shortcuts)}
        >
          {option.label}
        </option>
      ))}
    </select>
  )
}
