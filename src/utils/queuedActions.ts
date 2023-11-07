import { DeserializableRecord } from '@interval/sdk/dist/ioSchema'
import { Prisma } from '@prisma/client'

export function getQueuedActionParams(
  params: Prisma.JsonValue | undefined | null
): DeserializableRecord | undefined {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return

  const record: DeserializableRecord = {}

  for (const [key, val] of Object.entries(params as Prisma.JsonObject)) {
    if (typeof key === 'string' && (!val || typeof val !== 'object')) {
      record[key] = val
    }
  }

  return record
}
