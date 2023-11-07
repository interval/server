import { useState, useCallback, useEffect } from 'react'
import IVCheckbox from '~/components/IVCheckbox'
import IVInputField from '~/components/IVInputField'
import RenderValue from '~/components/RenderValue'
import { pluralizeWithCount } from '~/utils/text'
import { RCTResponderProps } from '~/components/RenderIOCall'
import { IOComponentError } from '~/components/RenderIOCall/ComponentError'
import useInput from '~/utils/useInput'

type OptionValue = RCTResponderProps<'SELECT_MULTIPLE'>['options'][0]['value']

function getComparisonValue(value: OptionValue) {
  if (value instanceof Date) {
    return value.valueOf()
  }

  return value
}

function valuesEqual(v1: OptionValue, v2: OptionValue) {
  return (
    getComparisonValue(v1) === getComparisonValue(v2) && typeof v1 === typeof v2
  )
}

export default function SelectMultiple(
  props: RCTResponderProps<'SELECT_MULTIPLE'>
) {
  const [selected, setSelected] = useState<typeof props.options>(
    (!(props.value instanceof IOComponentError) ? props.value : []) ?? []
  )

  type Options = typeof props.options
  type Option = Options[0]

  const {
    onUpdatePendingReturnValue,
    minSelections,
    maxSelections,
    isOptional,
  } = props
  const { errorMessage } = useInput(props)

  useEffect(() => {
    if (isOptional && !selected?.length) {
      onUpdatePendingReturnValue(undefined)
    } else if (
      minSelections !== undefined &&
      (selected?.length ?? 0) < minSelections
    ) {
      onUpdatePendingReturnValue(
        new IOComponentError(
          `Please make at least ${pluralizeWithCount(
            minSelections,
            'selection',
            'selections'
          )}.`
        )
      )
    } else if (
      maxSelections !== undefined &&
      (selected?.length ?? 0) > maxSelections
    ) {
      onUpdatePendingReturnValue(
        new IOComponentError(
          `Please make no more than ${pluralizeWithCount(
            maxSelections,
            'selection',
            'selections'
          )}.`
        )
      )
    } else {
      onUpdatePendingReturnValue(selected)
    }
  }, [
    selected,
    isOptional,
    minSelections,
    maxSelections,
    onUpdatePendingReturnValue,
  ])

  const toggleChecked = useCallback((option: Option) => {
    setSelected(selected => {
      let res: Options

      if (selected?.some(item => valuesEqual(item.value, option.value))) {
        res = selected?.filter(o => !valuesEqual(o.value, option.value))
      } else {
        res = [...selected, option]
      }

      return res
    })
  }, [])

  return (
    <IVInputField
      label={props.label}
      id={props.id}
      helpText={props.helpText}
      optional={props.isOptional}
      errorMessage={errorMessage}
    >
      <div>
        <div className="space-y-2 mb-2">
          {props.options.map((option, idx) => (
            <IVCheckbox
              key={props.id + '-' + option.value}
              label={<RenderValue value={option.label} />}
              value={option.value.toString()}
              id={props.id + '-' + option.value}
              aria-autocomplete="none"
              checked={selected?.some(item =>
                valuesEqual(item.value, option.value)
              )}
              disabled={props.disabled || props.isSubmitting}
              onChange={() => toggleChecked(option)}
              autoFocus={props.autoFocus && idx === 0}
            />
          ))}
        </div>
        <SelectionCriteria
          min={minSelections}
          max={maxSelections}
          selected={selected?.length ?? 0}
        />
      </div>
    </IVInputField>
  )
}

function SelectionCriteria({
  min,
  max,
  selected,
}: {
  min?: number
  max?: number
  selected: number
}) {
  const className = 'mt-2 text-gray-500'

  if (min !== undefined && max !== undefined) {
    return (
      <div className={`${className} ${selected > max ? 'text-red-600' : ''}`}>
        Selected {selected} of {min}-{max}
      </div>
    )
  }

  if (max !== undefined) {
    return (
      <div className={`${className} ${selected > max ? 'text-red-600' : ''}`}>
        Select up to {max}
      </div>
    )
  }

  if (min !== undefined) {
    return <div className={className}>Select at least {min}</div>
  }

  return null
}
