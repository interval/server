import { useCallback } from 'react'
import {
  useSearchParams as default_useSearchParams,
  NavigateOptions,
  ParamKeyValuePair,
  URLSearchParamsInit,
} from 'react-router-dom'

/**
 * A wrapper around useSearchParams with two changes:
 * - accepts nullish values and automatically unsets them
 * - adds support for functional updates to the setter function
 *
 * Based on `useSearchParams` in react-router-dom v4.6.1, which has a slightly nicer API.
 */

type CustomURLSearchParamsInit =
  | string
  | ParamKeyValuePair[]
  | Record<string, string | string[] | undefined | null>
  | URLSearchParams

type SetURLSearchParams = (
  nextInit:
    | CustomURLSearchParamsInit
    | ((prev: Record<string, string>) => CustomURLSearchParamsInit),
  navigateOpts?: NavigateOptions
) => void

export default function useSearchParams(
  defaultInit?: URLSearchParamsInit
): [URLSearchParams, SetURLSearchParams] {
  const [searchParams, setSearchParams] = default_useSearchParams(defaultInit)

  const newSetSearchParams = useCallback<SetURLSearchParams>(
    (nextInit, navigateOptions) => {
      const nextParams =
        typeof nextInit === 'function'
          ? nextInit(Object.fromEntries(searchParams))
          : nextInit

      const newSearchParams = new URLSearchParams(
        Object.fromEntries(
          Object.entries(nextParams).filter(
            ([_, value]) =>
              value !== undefined && value !== null && value !== ''
          )
        )
      )

      setSearchParams(newSearchParams, navigateOptions)
    },
    [setSearchParams, searchParams]
  )

  return [searchParams, newSetSearchParams]
}
