import { useMemo } from 'react'
import { IORenderInstruction } from '~/components/RenderIOCall'

export default function useInitialValues(
  elements: IORenderInstruction<boolean>[]
) {
  const initialValues = useMemo(
    () =>
      elements.map(el => {
        // non-interactive elements all return null
        if (!el.isInteractive) {
          return null
        }

        if (el.isMultiple && el.multipleProps?.defaultValue) {
          return el.multipleProps.defaultValue
        } else if (el.inputs && 'defaultValue' in el.inputs) {
          if (el.inputs.defaultValue && 'options' in el.inputs) {
            // must be SELECT_SINGLE or SELECT_MULTIPLE
            const options = el.inputs.options
            const defaultValue = el.inputs.defaultValue

            type OptionValue = typeof options[0]['value']

            const getComparisonValue = (value: OptionValue) => {
              if (value instanceof Date) {
                return value.valueOf()
              }

              return value
            }

            const valuesEqual = (v1: OptionValue, v2: OptionValue) => {
              return (
                getComparisonValue(v1) === getComparisonValue(v2) &&
                typeof v1 === typeof v2
              )
            }

            if (Array.isArray(defaultValue)) {
              return defaultValue.filter(v =>
                options.some(option => valuesEqual(option.value, v.value))
              )
            } else {
              if (
                options.some(option =>
                  valuesEqual(option.value, defaultValue.value)
                )
              ) {
                return defaultValue
              }
            }
          } else {
            return el.inputs.defaultValue
          }
        }

        return undefined
      }),
    // We only want this to run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  return initialValues
}
