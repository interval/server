import { ParsedActionResultSchema } from '@interval/sdk/dist/ioSchema'

/**
 * Parses the JSON result of a transaction into a more structured format.
 */
export function parseActionResult(
  res: string | undefined
): ParsedActionResultSchema {
  if (!res) {
    return {
      schemaVersion: 0,
      status: 'SUCCESS',
      data: null,
      meta: null,
    }
  }

  return JSON.parse(res)
}
