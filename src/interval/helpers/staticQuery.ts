// Don't use this with any query strings that aren't static

import { io } from '@interval/sdk'
import prisma from '~/server/prisma'

export default async function staticQuery(query: string) {
  const rows: Record<string, string>[] = await prisma.$queryRawUnsafe(query)
  await io.display.table('Rows', { data: rows })
}
