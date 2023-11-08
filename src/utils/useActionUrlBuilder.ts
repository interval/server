import { useCallback } from 'react'
import { useOrgParams } from './organization'
import type { ActionMode } from './types'
import { getActionUrl } from './actions'

export function useActionUrlBuilder(mode: ActionMode | 'anon-console') {
  const { orgEnvSlug } = useOrgParams()

  const actionUrlBuilder = useCallback(
    params => {
      return getActionUrl({
        ...params,
        orgEnvSlug,
        mode,
      })
    },
    [orgEnvSlug, mode]
  )

  return actionUrlBuilder
}
