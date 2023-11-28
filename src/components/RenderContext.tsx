import { createContext, useContext } from 'react'
import { SerializableRecord } from '@interval/sdk/dist/ioSchema'

export type RenderContextProps = {
  getActionUrl: (props: {
    base: string
    slug: string
    params?: SerializableRecord
    absolute?: boolean
  }) => string
  getUploadUrls?: (props: {
    objectKeys: string[]
    inputGroupKey: string
    transactionId: string
  }) => Promise<
    | {
        uploadUrl: string
        downloadUrl: string
      }[]
    | undefined
  >
  setNavigationWarning?: (args: {
    shouldWarn: boolean
    isTouched: boolean
  }) => void
}

export const RenderContext = createContext<RenderContextProps | undefined>(
  undefined
)

export function RenderContextProvider(props: {
  children: React.ReactNode
  getActionUrl: RenderContextProps['getActionUrl']
  getUploadUrls?: RenderContextProps['getUploadUrls']
  setNavigationWarning?: RenderContextProps['setNavigationWarning']
}) {
  return (
    <RenderContext.Provider
      value={{
        getActionUrl: props.getActionUrl,
        getUploadUrls: props.getUploadUrls,
        setNavigationWarning: props.setNavigationWarning,
      }}
    >
      {props.children}
    </RenderContext.Provider>
  )
}

export default function useRenderContext() {
  const context = useContext(RenderContext)
  if (context === undefined) {
    throw new Error(
      'useRenderContext must be used within a RenderContextProvider'
    )
  }
  return context
}
