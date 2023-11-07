import { ChangeEvent, useState } from 'react'
import IVInputField from '~/components/IVInputField'
import IVTextInput from '~/components/IVTextInput'
import { isEmail } from '~/utils/validate'
import { RCTResponderProps } from '~/components/RenderIOCall'
import { IOComponentError } from '~/components/RenderIOCall/ComponentError'
import useInput from '~/utils/useInput'

export default function InputEmail(props: RCTResponderProps<'INPUT_EMAIL'>) {
  const [state, setState] = useState(
    (!(props.value instanceof IOComponentError) ? props.value : '') ?? ''
  )
  const { errorMessage } = useInput(props)

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    const isValid =
      (isEmail(v) && v.length > 0) || (v.length === 0 && props.isOptional)
    setState(v)
    props.onUpdatePendingReturnValue(
      isValid ? v : new IOComponentError('Please enter a valid email.')
    )
  }

  return (
    <IVInputField
      label={props.label}
      id={props.id}
      helpText={props.helpText}
      optional={props.isOptional}
      errorMessage={errorMessage}
    >
      <IVTextInput
        autoFocus={props.autoFocus}
        id={props.id}
        autoCorrect="off"
        autoComplete="off"
        aria-autocomplete="none"
        // _search prevents browsers from suggesting contact info, 1Password widget, etc.
        // given the nature of Interval, we think users are unlikely to want to auto-fill personal logins.
        name={`${props.id}_search`}
        type="email"
        inputMode="email"
        disabled={props.disabled || props.isSubmitting}
        value={state}
        placeholder={props.isCurrentCall ? props.placeholder : undefined}
        onChange={onChange}
      />
    </IVInputField>
  )
}
