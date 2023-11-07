import { useCallback } from 'react'
import { IOComponentError } from '~/components/RenderIOCall/ComponentError'
import {
  IORenderInstruction,
  ReturnResponseValue,
  StateResponseValue,
} from '~/components/RenderIOCall'
import {
  ComponentNameMap,
  ImplementedComponents,
} from '~/utils/componentNameMap'
import ComponentError from './ComponentError'
import { supportsMultiple } from '@interval/sdk/dist/ioSchema'
import { ActionMode, ComponentContext } from '~/utils/types'

export interface ComponentRendererProps {
  mode: ActionMode
  component: IORenderInstruction<boolean>
  transaction?: any // this corresponds to a prisma type
  inputGroupKey: string
  index: number
  autoFocus: boolean
  onStateChange: (index: number, newState: StateResponseValue) => void
  onUpdatePendingReturnValue: (
    index: number,
    response: ReturnResponseValue
  ) => void
  setExtraLoadingMessage: (index: number, message: string) => void
  context?: ComponentContext
  isSubmitting: boolean
  shouldUseAppendUi?: boolean
  shouldDisableTableTruncation?: boolean
  isCurrentCall?: boolean
  submitAttempted: boolean
  value: ReturnResponseValue | IOComponentError | undefined | null
  components?: ComponentNameMap
  disabled?: boolean
}

export default function ComponentRenderer({
  component,
  index,
  onStateChange,
  onUpdatePendingReturnValue,
  setExtraLoadingMessage,
  context = 'transaction',
  components,
  ...rest
}: ComponentRendererProps) {
  const handleStateChange = useCallback(
    (newState: StateResponseValue) => {
      onStateChange(index, newState)
    },
    [onStateChange, index]
  )

  const handleSetExtraLoadingMessage = useCallback(
    (message: string) => {
      setExtraLoadingMessage(index, message)
    },
    [index, setExtraLoadingMessage]
  )

  const handlePendingReturnValue = useCallback(
    (response: ReturnResponseValue) => {
      onUpdatePendingReturnValue(index, response)
    },
    [onUpdatePendingReturnValue, index]
  )

  const Component =
    component.methodName in ImplementedComponents
      ? // @ts-ignore - not all methods implemented yet
        ImplementedComponents[component.methodName]
      : components
      ? components[component.methodName]
      : null

  if (!Component) {
    return (
      <p className="text-sm">
        Component {component.methodName} is not implemented.
      </p>
    )
  }

  if (component.error) {
    //@ts-ignore Haven't figured out how to statically guarantee
    return <ComponentError component={component} error={component.error} />
  }

  return (
    <Component
      id={`${component.methodName}-${index}-${rest.inputGroupKey}`}
      label={component.label}
      isStateful={component.isStateful}
      isOptional={component.isOptional}
      isMultiple={
        supportsMultiple(component.methodName) && component.isMultiple
      }
      error={component.error}
      {...component.inputs}
      context={context}
      onStateChange={handleStateChange}
      onUpdatePendingReturnValue={handlePendingReturnValue}
      setExtraLoadingMessage={handleSetExtraLoadingMessage}
      {...rest}
    />
  )
}
