import { lazy } from 'react'

const DisplayMarkdown = lazy(() =>
  // @ts-ignore
  import.meta.env.SSR ? import('./stub') : import('.')
)

export { DisplayMarkdown as default }
