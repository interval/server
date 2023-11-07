import { lazy } from 'react'

const DisplayHTML = lazy(() =>
  // @ts-ignore
  import.meta.env.SSR ? import('./stub') : import('.')
)

export { DisplayHTML as default }
