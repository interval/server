import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ioSchema } from '@interval/sdk/dist/ioSchema'
import {
  DashboardContext,
  DashboardContextValue,
} from '~/components/DashboardContext'
import { RenderContextProvider } from '~/components/RenderContext'
import { RenderIOCall } from '~/components/RenderIOCall'
import useInterval from '~/utils/useInterval'

import { UnimplementedComponents } from '~/components/TransactionUI'

const getActionUrl = () => {
  /* We don't need a real function since action URLs shouldn't work in documentation.  */
  return '#'
}

function DocsComponentPreview() {
  const [searchParams] = useSearchParams()

  const methodName = String(searchParams.get('methodName'))
  const label = String(searchParams.get('label'))
  const urlProps = String(searchParams.get('props'))
  const isOptional = searchParams.has('isOptional')
  const isMultiple = searchParams.has('isMultiple')
  const multipleUrlProps = String(searchParams.get('multipleProps'))

  const props = useMemo(() => {
    if (urlProps) {
      return JSON.parse(urlProps)
    }
  }, [urlProps])

  const multipleProps = useMemo(() => {
    if (multipleUrlProps) {
      return JSON.parse(multipleUrlProps)
    }
  }, [multipleUrlProps])

  // Broadcast height to the iframe so we display the full component
  useInterval(() => {
    const height = document.querySelector('html')?.offsetHeight ?? 0
    if (window.parent && height) {
      window.parent.postMessage({ height }, '*')
    }
  }, 1000)

  if (!methodName) {
    return <div>Method {methodName} not found.</div>
  }

  const ioCallProps = {
    key: methodName,
    id: methodName,
    async onRespond() {
      /* */
    },
    inputGroupKey: methodName,
    elements: [
      {
        methodName: methodName as keyof typeof ioSchema,
        label,
        inputs: props,
        isInteractive: true,
        isStateful: false,
        isOptional,
        isMultiple,
        multipleProps,
      },
    ],
    indexOfFirstInteractiveElement: null,
  }

  return (
    <div className="p-4 flex items-center justify-start">
      <div className="w-full">
        <RenderContextProvider getActionUrl={getActionUrl}>
          <RenderIOCall
            state="IN_PROGRESS"
            context="docs"
            renderNextButton={false}
            components={UnimplementedComponents}
            {...ioCallProps}
          />
        </RenderContextProvider>
      </div>
    </div>
  )
}

export default function DocsComponentPreviewPage() {
  return (
    <DashboardContext.Provider
      value={
        {
          organization: {
            id: '0',
            name: 'Interval',
            slug: 'interval',
            ownerId: '0',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        } as DashboardContextValue
      }
    >
      <DocsComponentPreview />
    </DashboardContext.Provider>
  )
}
