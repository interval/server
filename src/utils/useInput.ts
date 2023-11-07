import { T_IO_METHOD_NAMES, T_IO_RETURNS } from '@interval/sdk/dist/ioSchema'
import { IOComponentError } from '~/components/RenderIOCall/ComponentError'
import { useEffect, useState } from 'react'

export default function useInput(props: {
  submitAttempted: boolean
  value:
    | T_IO_RETURNS<T_IO_METHOD_NAMES>
    | T_IO_RETURNS<T_IO_METHOD_NAMES>[] // if isMultiple
    | IOComponentError
    | undefined
  isOptional?: boolean
  noValueMessage?: string
}) {
  const [isTouched, setIsTouched] = useState(false)

  // Show inline validation messages after the form is submitted.
  // We decided not to show validation messages on field blur because it causes lots of layout jumps,
  // e.g. it's a suboptimal experience to click out of the first auto-focused field and get a warning.
  useEffect(() => {
    if (props.submitAttempted) {
      setIsTouched(true)
    }
  }, [props.submitAttempted])

  let errorMessage: string | undefined
  if (isTouched) {
    if (!props.value && !props.isOptional) {
      errorMessage = props.noValueMessage ?? 'This field is required.'
    } else if (props.value instanceof IOComponentError) {
      errorMessage = props.value.message
    }
  }

  return {
    isTouched,
    setIsTouched,
    errorMessage,
  }
}
