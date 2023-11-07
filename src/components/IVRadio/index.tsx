import classNames from 'classnames'
import { preventDefaultInputEnterKey } from '~/utils/preventDefaultInputEnter'
import ComponentHelpText from '../HelpText'

export interface IVRadioProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  // require ID so labels can be associated with the inputs
  id: string
  label?: React.ReactNode
  helpText?: React.ReactNode
  inlineHelpText?: React.ReactNode
}

export default function IVRadio(props: IVRadioProps) {
  const { helpText, inlineHelpText, label, ...rest } = props

  return (
    <div className="relative flex items-start">
      <div className="flex items-center h-5">
        <input type="radio" {...rest} onKeyDown={preventDefaultInputEnterKey} />
      </div>
      <div className="ml-3 text-sm">
        <label
          htmlFor={props.id}
          className={classNames({
            'text-gray-700 cursor-pointer': !props.disabled,
            'text-gray-400 cursor-not-allowed': props.disabled,
          })}
        >
          {label}
          {inlineHelpText && (
            <span className="ml-2 text-gray-500">{inlineHelpText}</span>
          )}
        </label>
        {helpText && (
          <ComponentHelpText id="comments-description" className="mt-0.5">
            {helpText}
          </ComponentHelpText>
        )}
      </div>
    </div>
  )
}
