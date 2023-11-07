import classNames from 'classnames'
import getTextWidth from '~/utils/getTextWidth'
import { preventDefaultInputEnterKey } from '~/utils/preventDefaultInputEnter'

interface IVTextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prepend?: string
  append?: React.ReactNode
  inline?: boolean
  autoFocus?: boolean
}

export default function IVTextInput(props: IVTextInputProps) {
  const { className, autoFocus, ...rest } = props

  return (
    <div className={classNames('relative', { inline: props.inline })}>
      {props.prepend && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-500 sm:text-sm">{props.prepend}</span>
        </div>
      )}
      <input
        {...rest}
        id={props.id ?? props.name}
        className={classNames('form-input', className, {
          inline: props.inline,
        })}
        style={{
          paddingLeft: props.prepend ? getTextWidth(props.prepend) + 16 : 12,
        }}
        {...(autoFocus && { 'data-autofocus-target': true })}
        onKeyDown={preventDefaultInputEnterKey}
      />
      {props.append && (
        <div className="absolute inset-y-0 right-0 flex items-center">
          {props.append}
        </div>
      )}
    </div>
  )
}
