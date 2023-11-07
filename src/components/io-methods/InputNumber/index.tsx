import { useState, useCallback, useMemo } from 'react'
import IVInputField from '~/components/IVInputField'
import IVTextInput from '~/components/IVTextInput'
import { InvalidNumberError, validateNumber } from '~/utils/validate'
import { getCurrencySymbol } from '~/utils/currency'
import { RCTResponderProps } from '~/components/RenderIOCall'
import { IOComponentError } from '~/components/RenderIOCall/ComponentError'
import useInput from '~/utils/useInput'
import classNames from 'classnames'

export default function InputNumber(props: RCTResponderProps<'INPUT_NUMBER'>) {
  const [state, setState] = useState(
    (!(props.value instanceof IOComponentError) ? props.value : null) ?? ''
  )
  const { errorMessage } = useInput(props)

  const { min, max, isOptional, onUpdatePendingReturnValue } = props
  const decimals = props.decimals ?? (props.currency ? 2 : undefined)

  const constraintDetails = useMemo(() => {
    const constraints: string[] = []
    if (min !== undefined && max !== undefined) {
      constraints.push(`between ${min} and ${max}`)
    } else if (min !== undefined) {
      constraints.push(`greater than or equal to ${min}`)
    } else if (max !== undefined) {
      constraints.push(`less than or equal to ${max}`)
    }

    if (decimals) {
      return [
        'a number',
        ...constraints,
        `with up to ${decimals} decimals`,
      ].join(' ')
    } else {
      if (constraints.length) {
        return ['a whole number', ...constraints]
      } else {
        return undefined
      }
    }
  }, [min, max, decimals])

  const constraints = useMemo(
    () => (constraintDetails ? `Must be ${constraintDetails}.` : undefined),
    [constraintDetails]
  )

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value.replaceAll(',', '')

      // perform validity checks unless empty + optional
      if (value.length === 0 && isOptional) {
        onUpdatePendingReturnValue(undefined)
      } else if (value.length === 0) {
        onUpdatePendingReturnValue(new IOComponentError())
      } else {
        try {
          onUpdatePendingReturnValue(
            validateNumber(value, { min, max, decimals })
          )
        } catch (err) {
          if (err instanceof InvalidNumberError) {
            onUpdatePendingReturnValue(new IOComponentError(err.message))
          } else {
            console.error(err)
          }
        }
      }

      // With commas unstripped
      setState(event.target.value)
    },
    [min, max, isOptional, decimals, onUpdatePendingReturnValue]
  )

  return (
    <IVInputField
      label={props.label}
      id={props.id}
      helpText={props.helpText}
      optional={props.isOptional}
      errorMessage={errorMessage}
      constraints={constraints}
    >
      <div className="max-w-[270px]">
        <IVTextInput
          autoFocus={props.autoFocus}
          id={props.id}
          autoCorrect="off"
          autoComplete="off"
          aria-autocomplete="none"
          prepend={
            props.prepend ??
            (props.currency ? getCurrencySymbol(props.currency) : undefined)
          }
          append={
            props.currency && (
              <span className="text-gray-500 sm:text-sm pr-4">
                {props.currency}
              </span>
            )
          }
          className={classNames({
            'pr-14': props.currency,
          })}
          value={state}
          inputMode={decimals ? 'decimal' : 'numeric'}
          pattern={decimals ? undefined : '-?[0-9]*'}
          placeholder={props.isCurrentCall ? props.placeholder : undefined}
          disabled={props.disabled || props.isSubmitting}
          onChange={onChange}
        />
      </div>
    </IVInputField>
  )
}
