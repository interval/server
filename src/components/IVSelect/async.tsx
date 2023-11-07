import { useState, useCallback, useEffect } from 'react'
import { components } from 'react-select'
import AsyncSelect from 'react-select/async'
import { IVSelectOption } from '.'
import CloseIcon from '~/icons/compiled/Close'
import TailwindChevronDown from '~/icons/compiled/TailwindChevronDown'

export interface AsyncIVSelectProps {
  id?: string
  name?: string
  defaultValue?: IVSelectOption
  onSearch: (query: string) => Promise<IVSelectOption[]>
  onChange?: (value: string) => void
  onBlur?: () => void
  defaultOptions?: IVSelectOption[] | boolean
  defaultLabel?: string
  noOptionsMessage?: string
  cacheOptions?: boolean
  isClearable?: boolean
  disabled?: boolean
}

/**
 * This attempts to normalize the more advanced properties of a react-select
 * to be more similar to a bare <select> element, by returning unwrapped
 * string values instead of { label, value } objects. However, it does not
 * currently support an input `value` prop.
 *
 * Note, this will not work as the `as` prop of a Formik <Field />,
 * because its `onChange` handler expects an HTML event instead of an
 * unwrapped value as its argument.
 */
export default function AsyncIVSelect({
  id,
  name,
  defaultValue,
  onSearch,
  onBlur,
  onChange,
  defaultLabel,
  defaultOptions,
  noOptionsMessage,
  isClearable,
  disabled,
  cacheOptions = true,
}: AsyncIVSelectProps) {
  const [loadedDefaultOptions, setLoadedDefaultOptions] = useState<
    IVSelectOption[]
  >(() => {
    if (defaultOptions && defaultOptions !== true) return defaultOptions

    return []
  })

  useEffect(() => {
    if (defaultOptions) {
      if (defaultOptions === true) {
        onSearch('')
          .then(options => {
            setLoadedDefaultOptions(options)
          })
          .catch(err => {
            console.error('Failed loading initial options', err)
          })
      } else {
        setLoadedDefaultOptions(defaultOptions)
      }
    } else {
      setLoadedDefaultOptions([])
    }
  }, [onSearch, defaultOptions])

  const loadOptions = useCallback(
    (query: string, callback: (options: IVSelectOption[]) => void) => {
      onSearch(query)
        .then(options => {
          // eslint-disable-next-line promise/no-callback-in-promise
          callback(options)
        })
        .catch(err => {
          console.error('Failed loading options', err)
        })
    },
    [onSearch]
  )

  const handleChange = useCallback(
    (selected: IVSelectOption | null) => {
      if (onChange) {
        onChange(selected?.value ?? '')
      }
    },
    [onChange]
  )

  return (
    <AsyncSelect<IVSelectOption>
      className="iv-select-container"
      classNamePrefix="iv-select"
      components={{
        ClearIndicator: ({ innerProps }) => (
          <div {...innerProps} className="text-gray-400 hover:text-red-600">
            <CloseIcon className="w-3 h-3 mr-2" />
          </div>
        ),
        DropdownIndicator: () => <TailwindChevronDown className="mx-2 w-5" />,
        IndicatorSeparator: ({ hasValue, isDisabled, ...props }) => {
          if (hasValue && isClearable) {
            return (
              <components.IndicatorSeparator
                hasValue={hasValue}
                isDisabled={isDisabled}
                {...props}
              />
            )
          }

          return null
        },
      }}
      onChange={handleChange}
      defaultOptions={loadedDefaultOptions}
      loadOptions={loadOptions}
      defaultValue={defaultValue}
      cacheOptions={cacheOptions}
      inputId={id || name}
      name={name}
      onBlur={onBlur}
      placeholder={defaultLabel}
      noOptionsMessage={noOptionsMessage ? () => noOptionsMessage : undefined}
      isClearable={isClearable}
      isDisabled={disabled}
    />
  )
}
