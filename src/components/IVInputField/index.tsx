import classNames from 'classnames'
import IVConstraintsIndicator from '../IVConstraintsIndicator'
import ComponentHelpText from '../HelpText'

export function ErrorMessage({
  id,
  message,
}: {
  id?: string
  message: React.ReactNode
}) {
  return (
    <p
      className="text-sm text-amber-600 flex justify-start items-center mt-2"
      id={id ? `${id}-error` : undefined}
      data-pw="field-error"
    >
      {message}
    </p>
  )
}

interface IVInputFieldProps {
  children: React.ReactChild
  label?: React.ReactNode
  helpText?: React.ReactNode
  className?: string
  id: string
  errorMessage?: React.ReactNode
  // only used for showing the '(optional)' indicator, does not affect the validity of the field.
  optional?: boolean
  constraints?: string | React.ReactNode
}

export default function IVInputField({
  children,
  label,
  helpText,
  className,
  id,
  errorMessage,
  constraints,
  optional = false, // don't show 'optional' indicator by default
}: IVInputFieldProps) {
  return (
    <div
      className={classNames(className, {
        'has-error': !!errorMessage,
      })}
      data-pw="field"
    >
      <div className="flex justify-start">
        {label && (
          <label
            className={classNames('form-label cursor-pointer')}
            htmlFor={id}
          >
            {label}
            {optional === true && (
              <span className="opacity-50 font-normal ml-1">(optional)</span>
            )}
          </label>
        )}
        {constraints && (
          <span className="pl-2">
            <IVConstraintsIndicator
              constraints={constraints}
              id={id}
              placement="right"
            />
          </span>
        )}
      </div>
      {children}
      {helpText && (
        <ComponentHelpText className="mt-2" id={`${id}-description`}>
          {helpText}
        </ComponentHelpText>
      )}
      {errorMessage && <ErrorMessage id={id} message={errorMessage} />}
    </div>
  )
}
