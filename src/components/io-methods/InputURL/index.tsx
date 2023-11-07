import React, { useState, useCallback } from 'react'
import IVInputField from '~/components/IVInputField'
import IVTextInput from '~/components/IVTextInput'
import { commaSeparatedList } from '~/utils/text'
import { isUrl } from '~/utils/url'
import { RCTResponderProps } from '~/components/RenderIOCall'
import { IOComponentError } from '~/components/RenderIOCall/ComponentError'
import useInput from '~/utils/useInput'

export default function InputURL(props: RCTResponderProps<'INPUT_URL'>) {
  const [state, setState] = useState(
    (!(props.value instanceof IOComponentError) ? props.value : '') ?? ''
  )
  const { errorMessage } = useInput(props)

  const { onUpdatePendingReturnValue, isOptional } = props

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = String(e.target.value)
      setState(v)
      if (v.length > 0) {
        const protocols = props.allowedProtocols ?? ['http', 'https']

        const regex = new RegExp(protocols.join('|'))

        if (!isUrl(v)) {
          onUpdatePendingReturnValue(
            new IOComponentError(`Please enter a valid URL.`)
          )
        } else if (!regex.test(v)) {
          onUpdatePendingReturnValue(
            new IOComponentError(
              `The URL must begin with ${commaSeparatedList(protocols, 'or')}.`
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
    [isOptional, onUpdatePendingReturnValue, props.allowedProtocols]
  )

  return (
    <IVInputField
      label={props.label}
      id={props.id}
      helpText={props.helpText}
      optional={props.isOptional}
      errorMessage={errorMessage}
    >
      <IVTextInput
        id={props.id}
        value={state}
        placeholder={props.isCurrentCall ? props.placeholder : undefined}
        onChange={onChange}
        className={props.disabled ? 'bg-gray-50' : ''}
        autoCorrect="off"
        autoComplete="off"
        aria-autocomplete="none"
        type="text"
        disabled={props.disabled || props.isSubmitting}
      />
    </IVInputField>
  )
}
