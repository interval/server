import { logger } from '~/server/utils/logger'

export function generateSlug(desiredSlug: string): string {
  const slug = desiredSlug
    .toLowerCase()
    .trim()
    // replace " -- " with "--"
    .replace(/\s(-+)\s/g, str => str.trim())
    // strip quotes
    .replace(/['"]/g, '')
    // replace non-word characters with -
    .replace(/[^-_.a-zA-Z\d]+/g, '-')

  // Strip leading and trailing -
  const startMatch = slug.match(/-*((([^-]+)-+)*([^-]+))-*/)
  if (startMatch) {
    return startMatch[1]
  } else {
    logger.warn('Failed to strip leading and trailing hyphens from slug', {
      slug,
    })
  }

  return slug
}

export function getCollisionSafeSlug(
  desiredSlug: string,
  existing: string[]
): string {
  const existingSlugs = new Set(existing)

  if (existingSlugs.size === 0 || !existingSlugs.has(desiredSlug)) {
    return desiredSlug
  }

  let i = existingSlugs.size
  let slug = `${desiredSlug}-${i}`

  while (existingSlugs.has(slug)) {
    i++
    slug = `${desiredSlug}-${i}`
  }

  return slug
}
