import React, { useEffect, useRef, useState, useCallback } from 'react'
import IVInputField from '~/components/IVInputField'
import { RCTResponderProps } from '~/components/RenderIOCall'
import Select, {
  InputProps,
  MultiValue,
  OptionProps,
  SelectInstance,
  SingleValueProps,
  components,
} from 'react-select'
import classNames from 'classnames'
import useDebounce from '~/utils/useDebounce'
import usePrevious from '~/utils/usePrevious'
import { StateManagerProps } from 'react-select/dist/declarations/src/useStateManager'
import { dateTimeFormatter } from '~/utils/formatters'
import RenderValue from '~/components/RenderValue'
import useInput from '~/utils/useInput'
import { preventDefaultInputEnterKey } from '~/utils/preventDefaultInputEnter'

export type Result = RCTResponderProps<'SEARCH', boolean>['results'][0]

export const useMenuPlacement = (results: unknown[]) => {
  const selectRef = useRef<SelectInstance<Result, true> | null>(null)
  const [menuPlacement, setMenuPlacement] = useState<'auto' | 'top' | 'bottom'>(
    'auto'
  )
  const maxMenuHeight = 300

  // Infer best menu position for asynchronously loaded options
  useEffect(() => {
    if (!selectRef.current?.controlRef) return

    try {
      const distance =
        window.innerHeight -
        selectRef.current.controlRef.getBoundingClientRect().bottom

      setMenuPlacement(distance < maxMenuHeight ? 'top' : 'auto')
    } catch (e) {
      console.error(e)
    }
  }, [results, selectRef])

  return { menuPlacement, maxMenuHeight, selectRef }
}

const useSelectState = (props: RCTResponderProps<'SEARCH', boolean>) => {
  const [searchVal, setSearchVal] = useState('')
  const [value, setValue] = useState<Result | readonly Result[] | null>(() => {
    if (props.value) {
      if (props.isMultiple) {
        if (Array.isArray(props.value)) {
          // Not sure why TS can't tell this should be an array here if isMultiple is true

          const value: Result[] = []

          for (const val of props.value) {
            const initialResult = props.results.find(r => r.value === val)
            if (initialResult) {
              value.push(initialResult)
            }
          }

          return value
        }
      } else {
        return props.results.find(r => r.value === props.value) ?? null
      }
    }

    return null
  })
  const [isLoading, setIsLoading] = useState(false)

  const debouncedSearchVal = useDebounce(searchVal, 500)
  const previousDebouncedSearchVal = usePrevious(debouncedSearchVal)

  const { context, onStateChange } = props
  useEffect(() => {
    if (debouncedSearchVal === '') return
    if (previousDebouncedSearchVal === undefined) return
    if (debouncedSearchVal === previousDebouncedSearchVal) return
    if (context === 'docs') return

    setIsLoading(true)
    onStateChange({ queryTerm: debouncedSearchVal })
  }, [debouncedSearchVal, previousDebouncedSearchVal, onStateChange, context])

  // immediately show loading indicator when user starts typing while we wait for the debounced search term
  useEffect(() => {
    if (searchVal && context !== 'docs') {
      setIsLoading(true)
    } else if (!searchVal) {
      setIsLoading(false)
    }
  }, [searchVal, context])

  useEffect(() => {
    setIsLoading(false)
  }, [props.results])

  const onChange = (opt: Result | MultiValue<Result> | null) => {
    setValue(opt)

    if (!opt) {
      props.onUpdatePendingReturnValue(undefined)
    } else if (props.isMultiple && Array.isArray(opt)) {
      props.onUpdatePendingReturnValue(opt.map(o => o.value))
    } else if (!props.isMultiple && !Array.isArray(opt)) {
      props.onUpdatePendingReturnValue((opt as Result).value)
    }
  }

  const { menuPlacement, maxMenuHeight, selectRef } = useMenuPlacement(
    props.results
  )

  const selectProps: StateManagerProps<Result> = {
    value,
    onChange,
    isLoading,
    placeholder: props.isCurrentCall ? props.placeholder ?? 'Search...' : '',
    inputId: props.id,
    options: props.results,
    inputValue: searchVal,
    onInputChange: (newValue, actionMeta) => {
      if (
        actionMeta.action === 'input-change' ||
        actionMeta.action === 'set-value'
      ) {
        setSearchVal(newValue)
      }
    },
    autoFocus: props.autoFocus,
    className: 'iv-select-container',
    classNamePrefix: 'iv-select',
    isClearable: true,
    maxMenuHeight,
    menuPlacement,
    tabSelectsValue: true,
    noOptionsMessage: ({ inputValue }) =>
      inputValue ? 'No results found.' : null,
    components: {
      Input: CustomInputRenderer,
      Option: CustomOptionRenderer,
      SingleValue: CustomSingleValueRenderer,
      DropdownIndicator: null,
    },
    filterOption: () => !isLoading && context !== 'docs',
  }

  return {
    value,
    options: props.results,
    onChange,
    isLoading,
    selectProps,
    selectRef,
  }
}

export default function Search(props: RCTResponderProps<'SEARCH', boolean>) {
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

  // TODO search input disabled gray is not the same as other inputs
  // (I like it better though, it's more obviously gray)
  return (
    <IVInputField
      label={props.label}
      id={props.id}
      helpText={props.helpText}
      optional={props.isOptional}
      errorMessage={errorMessage}
    >
      <div {...(props.autoFocus && { 'data-autofocus-target': true })}>
        <Select<Result, boolean>
          {...state.selectProps}
          aria-autocomplete="none"
          isSearchable
          isDisabled={props.disabled || props.isSubmitting}
          isMulti={props.isMultiple}
          ref={state.selectRef}
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

function CustomOptionRenderer<T extends Result>(option: OptionProps<T>) {
  const imageWidth = option.data.image?.size ?? 'thumbnail'

  return (
    <div
      onClick={() => option.selectOption(option.data)}
      className={classNames('cursor-pointer flex items-center text-sm p-2', {
        'bg-primary-400 text-white': option.isSelected,
        'text-gray-700 hover:bg-gray-100': !option.isSelected,
        'bg-blue-100': option.isFocused && !option.isSelected,
      })}
      data-pw-search-result
      data-pw-search-result-focused={option.isFocused}
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
          className={classNames(
            'flex-none rounded object-contain bg-gray-100',
            {
              'w-dropdown-img-thumbnail h-dropdown-img-thumbnail mr-1.5':
                imageWidth === 'thumbnail',
              'w-dropdown-img-small h-dropdown-img-small mr-2':
                imageWidth === 'small',
              'w-dropdown-img-medium h-dropdown-img-medium m-1 mr-2.5':
                imageWidth === 'medium',
              'w-dropdown-img-large h-dropdown-img-large m-1 mr-3':
                imageWidth === 'large',
            }
          )}
        />
      )}
      <div
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
      </div>
    </div>
  )
}

const CustomSingleValueRenderer = (option: SingleValueProps<Result>) => {
  return (
    <div
      className="iv-select__single-value inline-block"
      style={{ gridArea: '1/1/2/3' }}
      data-pw-selected-search-result
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

const CustomInputRenderer = (props: InputProps<Result>) => {
  return (
    <components.Input
      {...props}
      {...(props.autoFocus && { 'data-autofocus-target': true })}
    />
  )
}
