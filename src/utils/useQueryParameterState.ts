import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { z, ZodSchema } from 'zod'

export default function useQueryParameterState<T extends ZodSchema>(
  schema: T,
  queryKey: string,
  initialValue: z.infer<T>
): [z.infer<T>, (value: z.infer<T>) => void] {
  const [state, setRawState] = useState<T>(initialValue)
  const [searchParams, setSearchParams] = useSearchParams()

  const queryValue = searchParams.get(queryKey)
  useEffect(() => {
    const parsed = schema.safeParse(queryValue)
    if (parsed.success) {
      setRawState(parsed.data)
    }
  }, [queryValue, schema])

  const setState = useCallback(
    (value: z.infer<T>) => {
      setRawState(value)

      const strValue = String(value)

      const kv: Record<string, string> = {}
      kv[queryKey] = strValue

      setSearchParams(kv, {
        replace: true,
      })
    },
    [queryKey, setSearchParams]
  )

  return [state, setState]
}
