import { BinaryToTextEncoding, createHash } from 'node:crypto'

/**
 * Should go without saying, but don't use this for anything security related.
 */
export function shaHash(
  input: string,
  encoding: BinaryToTextEncoding = 'hex'
): string {
  return createHash('sha256').update(input).digest(encoding)
}
