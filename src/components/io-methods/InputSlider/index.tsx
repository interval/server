import { useState, useCallback } from 'react'
import IVInputField from '~/components/IVInputField'
import { InvalidNumberError, validateNumber } from '~/utils/validate'
import { RCTResponderProps } from '~/components/RenderIOCall'
import { IOComponentError } from '~/components/RenderIOCall/ComponentError'
import useInput from '~/utils/useInput'

import { useRef, useEffect } from 'react'

function useRangeControl({ onChange }: { onChange: (value: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)

  // select all of the text when the input is focused
  useEffect(() => {
    const handleFocus = () => {
      setTimeout(() => {
        if (ref.current) {
          ref.current.select()
        }
      }, 10)
    }

    const input = ref.current

    if (input) {
      input.addEventListener('focus', handleFocus)

      return () => {
        input.removeEventListener('focus', handleFocus)
      }
    }
  }, [ref])

  // Support typing a numeric value with the number keys while the range is focused.
  // A timer is set after each keystroke. Additional keystrokes within the timer are appended
  // to the current value. After the timer expires, new keystrokes are treated as new input.
  const threshold = 1500
  const timeoutId = useRef<NodeJS.Timeout | null>(null)

  // We need to keep track of the typed value in state because the number input
  // will clear trailing decimal points while the user is typing, e.g. "1." -> "1"
  const [typedValue, setTypedValue] = useState('')

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key.match(/[0-9.]/)) {
      const nextValue = typedValue + event.key

      onChange(nextValue)
      setTypedValue(nextValue)

      timeoutId.current = setTimeout(() => {
        setTypedValue('')
      }, threshold)
    }
  }

  function onBlur() {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current)
    }
  }

  return { ref, onKeyDown, onBlur }
}

export default function InputSlider(props: RCTResponderProps<'INPUT_SLIDER'>) {
  const initialValue =
    props.value instanceof IOComponentError ? null : props.value

  const { min = 0, max = 100, isOptional, onUpdatePendingReturnValue } = props

  const [state, setState] = useState<string | number>(
    initialValue ?? Math.min(min, max)
  )
  const { errorMessage } = useInput(props)

  const decimals = props.step?.toString().split('.')[1]?.length ?? 0

  const onChange = useCallback(
    (val: string) => {
      const value = val.replaceAll(',', '')

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

      setState(val)
    },
    [min, max, isOptional, decimals, onUpdatePendingReturnValue]
  )

  const {
    ref: numberInputRef,
    onKeyDown,
    onBlur,
  } = useRangeControl({ onChange })

  return (
    <IVInputField
      label={props.label}
      id={props.id}
      helpText={props.helpText}
      optional={props.isOptional}
      errorMessage={errorMessage}
      className="max-w-[550px]"
    >
      <div className="flex items-center">
        <input
          id={`${props.id}-range`}
          type="range"
          value={state}
          className="w-[200px] mr-2"
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          min={props.min}
          max={props.max}
          step={props.step}
          disabled={props.disabled || props.isSubmitting}
          style={{
            backgroundSize:
              ((Number(state) - min) * 100) / (max - min) + '% 100%',
          }}
        />
        <div className="relative top-px">
          {/* sizer element */}
          <span
            className="opacity-0 invisible z-0 pl-1 pr-3 min-w-[40px]"
            aria-hidden
          >
            {state}
          </span>
          <input
            id={props.id}
            // "number" won't work here because we're programmatically setting the value,
            // so trailing decimals will be removed as the user types.
            type="text"
            inputMode={decimals ? 'decimal' : 'numeric'}
            pattern={decimals ? undefined : '-?[0-9]*'}
            value={state}
            className="text-sm absolute top-0 left-0 pl-1 pr-1 right-0 min-w-[40px] focus:outline-none invalid:text-amber-600 disabled:bg-transparent disabled:text-gray-500"
            onChange={e => onChange(e.target.value)}
            onBlur={onBlur}
            ref={numberInputRef}
            min={props.min}
            max={props.max}
            step={props.step}
            disabled={props.disabled || props.isSubmitting}
            tabIndex={-1}
          />
        </div>
      </div>
    </IVInputField>
  )
}
