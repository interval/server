import IVInputField from '~/components/IVInputField'
import { RCTResponderProps } from '~/components/RenderIOCall'
import { IOComponentError } from '~/components/RenderIOCall/ComponentError'
import IVRichTextEditor from '~/components/IVRichTextEditor/lazy'
import useInput from '~/utils/useInput'

export default function InputText(props: RCTResponderProps<'INPUT_RICH_TEXT'>) {
  const { errorMessage } = useInput(props)

  return (
    <IVInputField
      label={props.label}
      id={props.id}
      helpText={props.helpText}
      optional={props.isOptional}
      errorMessage={errorMessage}
    >
      <IVRichTextEditor
        autoFocus={props.autoFocus}
        id={props.id}
        placeholder={props.isCurrentCall ? props.placeholder : undefined}
        defaultValue={
          !(props.value instanceof IOComponentError) ? props.value : undefined
        }
        hasError={!!errorMessage}
        disabled={props.disabled || props.isSubmitting}
        onChange={(value, text) => {
          props.onUpdatePendingReturnValue(
            text.length > 0
              ? value
              : props.isOptional
              ? undefined
              : new IOComponentError()
          )
        }}
      />
    </IVInputField>
  )
}
