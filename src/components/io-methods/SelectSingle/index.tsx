import { useCallback, useEffect, useState } from 'react'
import IVInputField from '~/components/IVInputField'
import { RCTResponderProps } from '~/components/RenderIOCall'
import { IOComponentError } from '~/components/RenderIOCall/ComponentError'
import Select, {
  InputProps,
  OptionProps,
  SingleValueProps,
  components,
} from 'react-select'
import classNames from 'classnames'
import useDebounce from '~/utils/useDebounce'
import usePrevious from '~/utils/usePrevious'
import { StateManagerProps } from 'react-select/dist/declarations/src/useStateManager'
import useInput from '~/utils/useInput'
import TailwindChevronDown from '~/icons/compiled/TailwindChevronDown'
import RenderValue from '~/components/RenderValue'
import { dateTimeFormatter } from '~/utils/formatters'
import { useMenuPlacement } from '../Search'
import { preventDefaultInputEnterKey } from '~/utils/preventDefaultInputEnter'

type IV_Option = RCTResponderProps<'SELECT_SINGLE'>['options'][0]

const useSelectState = (props: RCTResponderProps<'SELECT_SINGLE'>) => {
  const [searchVal, setSearchVal] = useState('')
  const [value, setValue] = useState<IV_Option | null>(
    (!(props.value instanceof IOComponentError) ? props.value : null) ?? null
  )
  const [isLoading, setIsLoading] = useState(false)

  const debouncedSearchVal = useDebounce(searchVal, 500)
  const previousDebouncedSearchVal = usePrevious(debouncedSearchVal)

  const { isStateful, onStateChange } = props
  useEffect(() => {
    // no loading states or remote calls if not stateful
    if (!isStateful) return

    if (debouncedSearchVal === '') return
    if (previousDebouncedSearchVal === undefined) return
    if (debouncedSearchVal === previousDebouncedSearchVal) return

    setIsLoading(true)
    onStateChange({ queryTerm: debouncedSearchVal })
  }, [
    debouncedSearchVal,
    previousDebouncedSearchVal,
    onStateChange,
    isStateful,
  ])

  // immediately show loading indicator when user starts typing while we wait for the debounced search term
  useEffect(() => {
    if (searchVal && isStateful) {
      setIsLoading(true)
    }
  }, [searchVal, isStateful])

  useEffect(() => {
    setIsLoading(false)
  }, [props.options])

  const onChange = (opt: IV_Option | null) => {
    setValue(opt)
    props.onUpdatePendingReturnValue(opt || undefined)
  }

  const { menuPlacement, maxMenuHeight, selectRef } = useMenuPlacement(
    props.options
  )

  const selectProps: StateManagerProps<IV_Option, false> = {
    value,
    onChange,
    isLoading,
    inputId: props.id,
    options: props.options,
    onInputChange: setSearchVal,
    autoFocus: props.autoFocus,
    className: 'iv-select-container',
    classNamePrefix: 'iv-select',
    isClearable: true,
    menuPlacement,
    maxMenuHeight,
    components: {
      Input: CustomInputRenderer,
      Option: CustomOptionRenderer,
      SingleValue: CustomSingleValueRenderer,
      DropdownIndicator: () => <TailwindChevronDown className="m-2 w-5" />,
      IndicatorSeparator: ({ hasValue, isDisabled, ...props }) => {
        if (hasValue && !isDisabled) {
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
    },
    filterOption: isStateful && !isLoading ? () => true : undefined,
  }

  return {
    value,
    options: props.options,
    onChange,
    isLoading,
    selectProps,
    selectRef,
  }
}

export default function SelectSingle(
  props: RCTResponderProps<'SELECT_SINGLE'>
) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const state = useSelectState(props)
  const { errorMessage } = useInput(props)

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isMenuOpen) {
        preventDefaultInputEnterKey(event)
      }
    },
    [isMenuOpen]
  )

  return (
    <IVInputField
      label={props.label}
      id={props.id}
      helpText={props.helpText}
      optional={props.isOptional}
      errorMessage={errorMessage}
    >
      <div {...(props.autoFocus && { 'data-autofocus-target': true })}>
        <Select<IV_Option>
          {...state.selectProps}
          aria-autocomplete="none"
          isSearchable={props.searchable}
          placeholder={props.isCurrentCall ? 'Select...' : ''}
          isDisabled={props.disabled || props.isSubmitting}
          ref={state.selectRef as never}
          onMenuOpen={() => {
            setIsMenuOpen(true)
          }}
          onMenuClose={() => {
            setIsMenuOpen(false)
          }}
          onKeyDown={handleKeyDown}
        />
      </div>
    </IVInputField>
  )
}

function CustomOptionRenderer<T extends IV_Option>(
  option: OptionProps<T, false>
) {
  const imageWidth = option.data.image?.size ?? 'thumbnail'

  return (
    <div
      onClick={() => option.selectOption(option.data)}
      className={classNames('cursor-pointer flex items-center text-sm p-2', {
        'bg-primary-400 text-white': option.isSelected,
        'text-gray-700 hover:bg-gray-100': !option.isSelected,
        'bg-blue-100': option.isFocused && !option.isSelected,
      })}
    >
      {(option.data.image?.url || option.data.imageUrl) && (
        <img
          src={option.data.image?.url ?? option.data.imageUrl ?? undefined}
          alt={
            option.data.image?.alt ??
            (option.data.label instanceof Date
              ? dateTimeFormatter.format(option.data.label)
              : String(option.data.label))
          }
          className={classNames('flex-none rounded object-contain', {
            'w-dropdown-img-thumbnail h-dropdown-img-thumbnail mr-1.5':
              imageWidth === 'thumbnail',
            'w-dropdown-img-small h-dropdown-img-small mr-2':
              imageWidth === 'small',
            'w-dropdown-img-medium h-dropdown-img-medium m-1 mr-2.5':
              imageWidth === 'medium',
            'w-dropdown-img-large h-dropdown-img-large m-1 mr-3':
              imageWidth === 'large',
          })}
        />
      )}
      <p
        className={`overflow-hidden truncate ml-1 ${
          option.isSelected ? 'text-white text-opacity-70' : 'text-gray-400'
        }`}
      >
        <span
          className={classNames('mr-2 block', {
            'text-white': option.isSelected,
            'text-gray-800': !option.isSelected,
            'font-medium': !!option.data.description,
          })}
        >
          <RenderValue value={option.data.label} />
        </span>
        {option.data.description && (
          <span className="block text-xs leading-4">
            {option.data.description || ''}
          </span>
        )}
      </p>
    </div>
  )
}

const CustomSingleValueRenderer = (
  option: SingleValueProps<IV_Option, false>
) => {
  return (
    <div
      className="iv-select__single-value inline-block"
      style={{ gridArea: '1/1/2/3' }}
    >
      <div
        className={classNames(
          'cursor-pointer flex items-center justify-start text-sm py-1'
        )}
      >
        {(option.data.image?.url || option.data.imageUrl) && (
          <img
            src={option.data.image?.url ?? option.data.imageUrl ?? undefined}
            alt={
              option.data.image?.url ??
              (option.data.label instanceof Date
                ? dateTimeFormatter.format(option.data.label)
                : String(option.data.label))
            }
            className="w-6 h-6 flex-none mr-1.5 rounded"
          />
        )}
        <p className="ml-1">
          <RenderValue value={option.data.label} />
        </p>
      </div>
    </div>
  )
}

const CustomInputRenderer = (props: InputProps<IV_Option>) => {
  return (
    <components.Input
      {...props}
      {...(props.autoFocus && { 'data-autofocus-target': true })}
    />
  )
}
