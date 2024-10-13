import { ctx } from '@interval/sdk'

export default function requireParam(key: string) {
  if (ctx.params[key] === undefined) {
    throw new Error(`Missing required param: ${key}`)
  }

  return String(ctx.params[key])
}
