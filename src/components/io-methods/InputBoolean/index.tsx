import { useState } from 'react'
import IVCheckbox from '~/components/IVCheckbox'
import { RCTResponderProps } from '~/components/RenderIOCall'
import { IOComponentError } from '~/components/RenderIOCall/ComponentError'

export default function InputBoolean(
  props: RCTResponderProps<'INPUT_BOOLEAN'>
) {
  const [isChecked, setIsChecked] = useState(
    !(props.value instanceof IOComponentError) ? props.value : false
  )

  const toggleChecked = (value: boolean) => {
    setIsChecked(value)
    props.onUpdatePendingReturnValue(value)
  }

  return (
    <div className="space-y-2">
      <IVCheckbox
        autoFocus={props.autoFocus}
        label={props.label}
        id={props.id}
        helpText={props.helpText}
        aria-autocomplete="none"
        checked={isChecked}
        disabled={props.disabled || props.isSubmitting}
        onChange={e => toggleChecked(e.target.checked)}
      />
    </div>
  )
}
