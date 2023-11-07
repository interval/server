import React, { useCallback, useMemo, useState } from 'react'
import { IOComponentError } from '~/components/RenderIOCall/ComponentError'
import { RCTResponderProps } from '~/components/RenderIOCall'
import useInput from '~/utils/useInput'
import IVInputField from '~/components/IVInputField'
import { preventDefaultInputEnterKey } from '~/utils/preventDefaultInputEnter'

export default function InputText(props: RCTResponderProps<'INPUT_TEXT'>) {
  const [state, setState] = useState(
    (!(props.value instanceof IOComponentError) ? props.value : '') ?? ''
  )
  const { errorMessage } = useInput(props)

  const { onUpdatePendingReturnValue, isOptional, minLength, maxLength } = props

  const constraintDetails = useMemo(() => {
    if (minLength && maxLength) {
      return `between ${minLength} and ${maxLength} characters`
    } else if (minLength) {
      return `at least ${minLength} characters`
    } else if (maxLength) {
      return `at most ${maxLength} characters`
    }

    return undefined
  }, [minLength, maxLength])

  const constraints = useMemo(
    () => (constraintDetails ? `Must be ${constraintDetails}.` : undefined),
    [constraintDetails]
  )

  const shared = {
    id: props.id,
    value: state,
    placeholder: props.isCurrentCall ? props.placeholder : undefined,
    disabled: props.disabled || props.isSubmitting,
    onChange: useCallback(
      (e: any) => {
        const v = e.target.value
        setState(v)
        if (v.length > 0) {
          if (
            (minLength && v.length < minLength) ||
            (maxLength && v.length > maxLength)
          ) {
            onUpdatePendingReturnValue(
              new IOComponentError(
                `Please enter a value with ${constraintDetails}.`
              )
            )
          } else {
            onUpdatePendingReturnValue(v)
          }
        } else if (isOptional) {
          onUpdatePendingReturnValue(undefined)
        } else {
          onUpdatePendingReturnValue(new IOComponentError())
        }
      },
      [
        onUpdatePendingReturnValue,
        isOptional,
        minLength,
        maxLength,
        constraintDetails,
      ]
    ),
    className: 'form-input',
    ...(props.autoFocus && { 'data-autofocus-target': true }),
  }

  return (
    <IVInputField
      label={props.label}
      id={props.id}
      helpText={props.helpText}
      optional={props.isOptional}
      errorMessage={errorMessage}
      constraints={constraints}
    >
      {props.multiline ? (
        <textarea {...shared} rows={props.lines || 3} />
      ) : (
        <input
          {...shared}
          type="text"
          autoCorrect="off"
          autoComplete="off"
          aria-autocomplete="none"
          onKeyDown={preventDefaultInputEnterKey}
        />
      )}
    </IVInputField>
  )
}
