import React, { useCallback, useMemo, useState, useEffect } from 'react'
import { IOComponentError } from '~/components/RenderIOCall/ComponentError'
import { UI_STATE } from '~/components/TransactionUI/useTransaction'
import ComponentRenderer, { ComponentRendererProps } from './ComponentRenderer'
import useInitialValues from './useInitialValues'
import useShouldWarnOnNavigation from '~/utils/useShouldWarnOnNavigation'
import { ComponentNameMap } from '~/utils/componentNameMap'
import ChoiceButtons from '~/components/ChoiceButtons'
import useTransactionAutoScroll from '~/utils/useTransactionAutoScroll'
import useTransactionAutoFocus from '~/utils/useTransactionAutoFocus'
import classNames from 'classnames'
import CheckCircleIcon from '~/icons/compiled/CheckCircleOutline'
import useSubmitFormWithShortcut from '~/utils/useSubmitFormWithShortcut'
import { ActionMode, ComponentContext } from '~/utils/types'
import {
  ioSchema,
  T_IO_METHOD_NAMES,
  T_IO_PROPS,
  T_IO_RENDER,
  T_IO_RESPONSE_KIND,
  T_IO_RETURNS,
  T_IO_STATE,
} from '@interval/sdk/dist/ioSchema'
import { ButtonConfig, ChoiceButtonConfig } from '@interval/sdk/dist/types'
import { ZodError } from 'zod'

/**
 * `transaction` is used for:
 * - determining if action is backgroundable
 * - io.input.file -> transaction.id
 * - io.confirmIdentity -> transaction.id
 * - CompletionState
 * - useTransaction
 * - useConsole
 */

export type ParsedRenderInstructions = T_IO_RENDER['toRender'][0]

export interface IORenderInstruction<IsMultiple extends boolean = false>
  extends ParsedRenderInstructions {
  methodName: T_IO_METHOD_NAMES
  label: string
  inputs?: T_IO_PROPS<T_IO_METHOD_NAMES>
  isInteractive: boolean
  isStateful: boolean
  isOptional: boolean
  isMultiple: IsMultiple
  multipleProps?: IsMultiple extends true
    ? {
        defaultValue?: T_IO_RETURNS<T_IO_METHOD_NAMES>[] | null
      }
    : never
  error?: ZodError
}

// Optional fields return undefined
export type ReturnResponseValue =
  | T_IO_RETURNS<T_IO_METHOD_NAMES>
  | T_IO_RETURNS<T_IO_METHOD_NAMES>[]

export type StateResponseValue = T_IO_STATE<T_IO_METHOD_NAMES>

export type OnRespond = {
  response: (ReturnResponseValue | undefined)[] | StateResponseValue[]
  kind: T_IO_RESPONSE_KIND
  choice?: string
  options?: { didPreviousCallAcceptInput?: boolean }
}

export type IOCallProps = {
  onRespond: (onRespond: OnRespond) => Promise<void>
  id: string
  inputGroupKey: string
  elements: IORenderInstruction<boolean>[]
  indexOfFirstInteractiveElement: number | null
  validationErrorMessage?: string | undefined | null
  continueButton?: Omit<ButtonConfig, 'theme'> & {
    theme?: ButtonConfig['theme'] | 'default'
  }
  choiceButtons?: (Omit<ChoiceButtonConfig, 'theme'> & {
    theme?: ButtonConfig['theme'] | 'default'
  })[]
}

export type RCTResponderProps<
  MethodName extends keyof typeof ioSchema,
  IsMultiple extends boolean = false
> = T_IO_PROPS<MethodName> & {
  mode: ActionMode
  id: string
  transaction?: ComponentRendererProps['transaction'] // this corresponds to a prisma type
  inputGroupKey: string
  label: string
  autoFocus: boolean
  isStateful?: boolean
  isOptional?: boolean
  isMultiple?: IsMultiple
  context?: ComponentContext
  error?: ZodError
  isSubmitting: boolean
  shouldUseAppendUi: boolean
  shouldDisableTableTruncation: boolean
  isCurrentCall: boolean
  disabled?: boolean
  submitAttempted: boolean
  value: IsMultiple extends true
    ? T_IO_RETURNS<MethodName>[]
    : T_IO_RETURNS<MethodName> | IOComponentError | undefined
  defaultValue?: IsMultiple extends true
    ? T_IO_RETURNS<MethodName>[]
    : T_IO_RETURNS<MethodName>
  onStateChange: (newState: T_IO_STATE<MethodName>) => void
  setExtraLoadingMessage: (message: string) => void
  onUpdatePendingReturnValue: (
    returns:
      | (IsMultiple extends true
          ? T_IO_RETURNS<MethodName>[]
          : T_IO_RETURNS<MethodName>)
      | Promise<
          | (IsMultiple extends true
              ? T_IO_RETURNS<MethodName>[]
              : T_IO_RETURNS<MethodName>)
          | undefined
        >
      | IOComponentError
      | undefined
  ) => void
}

export type RenderIOCallProps = IOCallProps & {
  state: UI_STATE
  initialInputGroupKey?: string
  transaction?: ComponentRendererProps['transaction']
  context: ComponentContext
  onValidate?: () => void
  renderNextButton?: boolean
  mode?: ActionMode
  components?: ComponentNameMap
  disabled?: boolean
  isCurrentCall?: boolean
  shouldUseAppendUi?: boolean
  didPreviousCallAcceptInput?: boolean
  renderPreviousInputStyle?: boolean
  shouldDisableTableTruncation?: boolean
  inputGroupIndex?: number
  className?: string
}

export function RenderIOCall(props: RenderIOCallProps) {
  const {
    elements,
    onRespond,
    onValidate,
    inputGroupKey,
    className = '',
    renderNextButton = true,
    mode = 'live',
    choiceButtons,
    disabled = false,
    isCurrentCall = false,
    didPreviousCallAcceptInput = false,
    renderPreviousInputStyle = false,
    shouldUseAppendUi = false,
    shouldDisableTableTruncation = false,
  } = props

  const initialValues = useInitialValues(props.elements)

  // TODO: store these in a context?
  const [isSubmitting, setSubmitting] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [submittedChoice, setSubmittedChoice] = useState<{
    label: string
    value: string
    index: number
  } | null>(null)
  const [extraLoadingMessages, setExtraLoadingMessages] = useState<{
    [key: number]: string
  }>({})

  const [returnValues, setReturnValues] = useState<
    (ReturnResponseValue | IOComponentError | undefined)[]
  >(() => initialValues)

  const isTouched = useMemo(
    () => returnValues.some((rv, i) => rv !== initialValues[i]),
    [initialValues, returnValues]
  )

  const [pendingStateCallQueue, setPendingStateCallQueue] = useState<
    [number, StateResponseValue][]
  >([])
  const [pendingStateCallPromise, setPendingStateCallPromise] =
    useState<Promise<void> | null>(null)

  const [_, setStateValues] = useState<(StateResponseValue | null)[]>(
    elements.map(() => null)
  )

  const handleStateChange = useCallback(
    async (index: number, newState: StateResponseValue) => {
      setPendingStateCallQueue(prev => [...prev, [index, newState]])
    },
    []
  )

  useShouldWarnOnNavigation({ ...props, isTouched })

  useEffect(() => {
    if (pendingStateCallQueue.length === 0 || pendingStateCallPromise) return

    setStateValues(stateValues => {
      const updated = [...stateValues]
      for (const [index, newState] of pendingStateCallQueue) {
        updated[index] = newState
      }

      setPendingStateCallPromise(
        onRespond({
          response: updated,
          kind: 'SET_STATE',
        }).then(() => {
          setPendingStateCallQueue([])
          setPendingStateCallPromise(null)
        })
      )

      return updated
    })
  }, [onRespond, pendingStateCallQueue, pendingStateCallPromise])

  const handleUpdatePendingReturnValue = useCallback(
    (index: number, response: ReturnResponseValue) => {
      setReturnValues(prev => {
        const updated = [...prev]
        updated[index] = response

        return updated
      })
    },
    [setReturnValues]
  )

  const isConfirmOrCredentials =
    elements.length === 1 &&
    ['CONFIRM', 'CONFIRM_IDENTITY', 'CREDENTIALS'].includes(
      elements[0]?.methodName
    )

  // immediately respond when a choice in the CONFIRM component is selected
  useEffect(() => {
    const returnValue = returnValues[0]

    if (isConfirmOrCredentials && returnValue !== undefined) {
      if (returnValue instanceof IOComponentError) {
        setSubmitting(false)
      } else {
        setSubmitting(true)
        onRespond({
          response: [returnValue],
          kind: 'RETURN',
          options: {
            didPreviousCallAcceptInput: true,
          },
        })
      }
    }
  }, [elements, onRespond, returnValues, isConfirmOrCredentials])

  // reset submitting state when receiving a new render call
  // (i.e. after failed validation)
  useEffect(() => {
    setReturnValues(prev => {
      const updated = [...prev]
      elements.forEach((element, index) => {
        if (element.validationErrorMessage) {
          updated[index] = new IOComponentError(element.validationErrorMessage)
        }
      })

      return updated
    })

    setSubmitting(prevIsSubmitting => {
      if (prevIsSubmitting) {
        setSubmitAttempted(true)
      }
      return false
    })
  }, [elements])

  const onSubmit = useCallback(
    (choice: { value: string; label: string; index: number }) => {
      return (
        e:
          | React.FormEvent<HTMLFormElement>
          | React.MouseEvent<HTMLButtonElement, MouseEvent>
      ) => {
        e.preventDefault()

        if (disabled) return

        // We do this array pushing instead of merely checking to appease types,
        // we could cast at the end but won't protect us from future errors
        const returnValuesToSubmit: (
          | ReturnResponseValue
          | undefined
          | Promise<ReturnResponseValue | undefined>
        )[] = []
        const invalidEntries: [IOComponentError | undefined, number][] = []

        returnValues.forEach((value, index) => {
          if (
            (elements[index].isInteractive &&
              !elements[index].isOptional &&
              value === undefined) ||
            value instanceof IOComponentError
          ) {
            invalidEntries.push([value, index])
          } else {
            returnValuesToSubmit.push(value)
          }
        })

        if (
          returnValuesToSubmit.length !== returnValues.length ||
          invalidEntries.length > 0
        ) {
          console.log('Return values incomplete, not submitting')
          setSubmitAttempted(true)
          if (onValidate) onValidate()
          return
        }

        setSubmitting(true)
        setSubmittedChoice(choice)

        Promise.allSettled(
          returnValuesToSubmit.map(async value => {
            if (value instanceof Promise<ReturnResponseValue | undefined>) {
              return await value
            }
            return value
          })
        )
          .then(values => {
            const resolvedValues = values.map(v => {
              if (v.status === 'fulfilled') {
                return v.value
              } else if (v.status === 'rejected') {
                throw new IOComponentError(v.reason)
              }
            })
            onRespond({
              response: resolvedValues,
              kind: 'RETURN',
              options: {
                didPreviousCallAcceptInput: true,
              },
              choice: choice.value,
            })
            setExtraLoadingMessages({})
          })
          .catch(err => {
            console.error('Error awaiting deferred values', err)
          })
      }
    },
    [disabled, elements, onRespond, onValidate, returnValues]
  )

  // reset submitting state when receiving a new render call
  useEffect(() => {
    if (!isCurrentCall) {
      setSubmitting(false)
    }
  }, [isCurrentCall])

  const hasInteractiveElements = elements.some(element => element.isInteractive)

  const shouldRenderContinueButton = (() => {
    if (!isCurrentCall) return false

    if (!renderNextButton) return false

    if (isConfirmOrCredentials) return false

    if (disabled) return false

    if (choiceButtons?.length) return true

    if (shouldUseAppendUi && !hasInteractiveElements) return false

    return true
  })()

  const { formRef } = useSubmitFormWithShortcut({
    enabled: shouldRenderContinueButton,
  })

  const setExtraLoadingMessage = useCallback(
    (index: number, message: string) => {
      setExtraLoadingMessages(prev => {
        const newState = { ...prev }
        newState[index] = message
        return newState
      })
    },
    []
  )

  const isFirstCall = props.inputGroupIndex === 0
  const isAction = props.context === 'transaction'

  useTransactionAutoScroll({
    enabled:
      shouldUseAppendUi &&
      didPreviousCallAcceptInput &&
      isCurrentCall &&
      !isFirstCall,
    ref: formRef,
  })

  useTransactionAutoFocus({
    enabled: isCurrentCall,
    ref: formRef,
  })

  const firstButtonLabel =
    (choiceButtons && choiceButtons[0]?.label) || 'Continue'
  const firstButtonValue =
    (choiceButtons && choiceButtons[0]?.value) || firstButtonLabel
  const extraLoadingMessage = Array.from(
    new Set(Object.values(extraLoadingMessages).filter(v => !!v))
  ).join(', ')

  return (
    <form
      key={inputGroupKey}
      onSubmit={onSubmit({
        value: firstButtonValue,
        label: firstButtonLabel,
        index: 0,
      })}
      ref={formRef}
      className={classNames(className, {
        'py-4': isAction,
        'relative before:bg-gray-200 before:duration-100 before:content before:absolute before:top-0 before:left-0 before:h-full before:w-[4px] transition-all duration-300 ease-in-out':
          isAction && shouldUseAppendUi,
        'before:opacity-0': !renderPreviousInputStyle,
        'before:opacity-100 pl-6 opacity-100 hover:opacity-100 input-group--previous before:delay-[150ms]':
          renderPreviousInputStyle,
      })}
    >
      <div className="io-component-renderer space-y-4">
        {elements.map((component, index) => (
          <ComponentRenderer
            key={`${inputGroupKey}:${index}`}
            component={component}
            inputGroupKey={inputGroupKey}
            index={index}
            transaction={props.transaction}
            autoFocus={props.indexOfFirstInteractiveElement === index}
            onStateChange={handleStateChange}
            onUpdatePendingReturnValue={handleUpdatePendingReturnValue}
            setExtraLoadingMessage={setExtraLoadingMessage}
            context={props.context}
            value={returnValues[index]}
            isSubmitting={isSubmitting}
            shouldUseAppendUi={shouldUseAppendUi}
            shouldDisableTableTruncation={shouldDisableTableTruncation}
            isCurrentCall={isCurrentCall}
            submitAttempted={submitAttempted}
            mode={mode}
            components={props.components}
            disabled={
              disabled ||
              (component.inputs && 'disabled' in component.inputs
                ? component.inputs.disabled
                : false)
            }
          />
        ))}
      </div>
      {shouldRenderContinueButton && (
        <ChoiceButtons
          isSubmitting={isSubmitting}
          submittedChoice={submittedChoice}
          disabled={disabled}
          validationErrorMessage={props.validationErrorMessage}
          onSubmit={onSubmit}
          choices={choiceButtons}
          extraLoadingMessage={extraLoadingMessage}
        />
      )}
      {submittedChoice && !isCurrentCall && shouldUseAppendUi && (
        <div className="text-sm text-gray-700 font-medium flex items-center mt-6 cursor-default">
          <CheckCircleIcon className="w-5 h-5 mr-2" />
          <span>{submittedChoice.label}</span>
        </div>
      )}
    </form>
  )
}
