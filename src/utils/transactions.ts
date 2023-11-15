import {
  ButtonConfig,
  ChoiceButtonConfig,
  NotificationDeliveryInstruction,
} from '@interval/sdk/dist/types'
import {
  ioSchema,
  IO_RENDER,
  T_IO_RENDER,
  T_IO_METHOD_NAMES,
  T_IO_Schema,
} from '@interval/sdk/dist/ioSchema'
import { logger } from '~/utils/logger'
// IMPORTANT: This file cannot be imported from the server
// because of this import ⬇
import type { IORenderInstruction, OnRespond } from '~/components/RenderIOCall'

import superjson from './superjson'

export interface NotificationPayload {
  message: string
  title?: string
  deliveries: NotificationDeliveryInstruction[]
}

export interface PendingIOCall {
  onRespond: (onRespond: OnRespond) => Promise<void>
  id: string
  inputGroupKey: string
  elements: IORenderInstruction<boolean>[]
  indexOfFirstInteractiveElement: number | null
  validationErrorMessage?: string | undefined | null
  choiceButtons?: (Omit<ChoiceButtonConfig, 'theme'> & {
    theme?: ButtonConfig['theme'] | 'default'
  })[]
}

export function unpackIOCall(
  parsed: T_IO_RENDER
): Omit<PendingIOCall, 'onRespond'> {
  const elements: IORenderInstruction<boolean>[] = []

  let indexOfFirstInteractiveElement: number | null = null
  for (const [index, element] of parsed.toRender.entries()) {
    const methodName = element.methodName as keyof typeof ioSchema

    const schemaForMethod: T_IO_Schema[T_IO_METHOD_NAMES] | undefined =
      ioSchema[methodName]

    if (!schemaForMethod) {
      throw new Error(`There is no schema for ${methodName}`)
    }

    if (element.props && element.propsMeta) {
      try {
        element.props = superjson.deserialize({
          json: element.props,
          meta: element.propsMeta,
        })
      } catch (error) {
        logger.error('Error from SuperJSON deserialization', {
          error,
          meta: element.propsMeta,
        })
      }
    }

    const inputs = schemaForMethod.props.safeParse(element.props ?? {})

    const isInteractive =
      ioSchema[methodName].returns._def.typeName !== 'ZodNull'

    if (isInteractive && indexOfFirstInteractiveElement === null) {
      indexOfFirstInteractiveElement = index
    }

    elements.push({
      methodName,
      label: element.label,
      inputs: inputs.success ? inputs.data : {},
      error: !inputs.success ? inputs.error : undefined,
      isInteractive,
      isStateful: element.isStateful,
      isOptional: element.isOptional,
      isMultiple: element.isMultiple,
      multipleProps: element.multipleProps ?? undefined,
      validationErrorMessage: element.validationErrorMessage,
    })
  }

  let choiceButtons = parsed.choiceButtons ?? undefined

  if (!choiceButtons?.length && parsed.continueButton) {
    choiceButtons = [
      {
        label: parsed.continueButton.label ?? 'Continue',
        theme:
          parsed.continueButton.theme === 'default'
            ? 'primary'
            : parsed.continueButton.theme,
        value: parsed.continueButton.label ?? 'Continue',
      },
    ]
  }

  return {
    elements,
    inputGroupKey: parsed.inputGroupKey,
    id: parsed.id,
    indexOfFirstInteractiveElement,
    validationErrorMessage: parsed.validationErrorMessage,
    choiceButtons,
  }
}

export function parseIOCall(
  callText: string
): Omit<PendingIOCall, 'onRespond'> {
  const parsed = IO_RENDER.parse(JSON.parse(callText))
  return unpackIOCall(parsed)
}
