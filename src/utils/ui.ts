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
import { ComponentRendererProps } from '~/components/RenderIOCall/ComponentRenderer'
import { IOComponentError } from '~/components/RenderIOCall/ComponentError'
import { ActionMode, ComponentContext } from './types'

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
