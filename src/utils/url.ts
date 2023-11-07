import urlRegex from 'url-regex-safe'
import tlds from 'tlds'

export function getURLsFromString(str: string) {
  return str.match(
    urlRegex({
      // URLs must start with a valid protocol or www
      strict: true,
      tlds: [...tlds, 'test'],
    })
  )
}

export function isUrl(str: string): boolean {
  return urlRegex({ exact: true, tlds: [...tlds, 'test'] }).test(str)
}

export function getBackPath(url: string): string {
  if (url.endsWith('/')) {
    url = url.substring(0, url.length - 1)
  }

  return url.substring(0, url.lastIndexOf('/'))
}

export function getCurrentPath() {
  if (typeof window === 'undefined') return undefined

  let path = window.location.pathname

  if (window.location.search) {
    path += window.location.search
  }

  if (window.location.hash) {
    path += window.location.hash
  }

  return path
}
