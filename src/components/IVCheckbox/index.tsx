import classNames from 'classnames'
import IVConstraintsIndicator from '~/components/IVConstraintsIndicator'
import { preventDefaultInputEnterKey } from '~/utils/preventDefaultInputEnter'
import ComponentHelpText from '../HelpText'

export interface IVCheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  // require ID so labels can be associated with the inputs
  id: string
  label?: React.ReactNode
  helpText?: React.ReactNode
  constraints?: React.ReactNode
}

export default function IVCheckbox(props: IVCheckboxProps) {
  const { helpText, label, constraints, autoFocus, ...rest } = props

  return (
    <label
      htmlFor={props.id}
      className={classNames('relative flex items-start', {
        'cursor-pointer': !props.disabled,
        'cursor-not-allowed': props.disabled,
      })}
    >
      <div className="flex items-center h-5">
        <input
          type="checkbox"
          {...rest}
          {...(props.autoFocus && { 'data-autofocus-target': true })}
          onKeyDown={preventDefaultInputEnterKey}
        />
      </div>
      <div className="ml-3 text-sm">
        <span
          className={classNames('text-gray-700', {
            'opacity-50': props.disabled,
          })}
        >
          {label}
          {constraints && (
            <span className="pl-2 inline-block align-middle">
              <IVConstraintsIndicator
                constraints={constraints}
                id={props.id}
                placement="right-start"
              />
            </span>
          )}
        </span>
        {helpText && (
          <ComponentHelpText className="mt-0.5">{helpText}</ComponentHelpText>
        )}
      </div>
    </label>
  )
}
