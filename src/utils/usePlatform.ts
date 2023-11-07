/* While navigator.platform is deprecated, there is no better way to detect this right now */
export function reportsAsAppleDevice() {
  if (typeof window !== 'undefined') {
    const re = /Mac|iPhone/gi
    return window.navigator?.platform && re.test(window.navigator.platform)
  }

  return false
}

export interface ShortcutMap {
  mac?: string
  pc?: string
}

export function getShortcuts(
  shortcuts: string | ShortcutMap | undefined
): string | undefined {
  if (!shortcuts) return undefined
  if (typeof shortcuts === 'string') return shortcuts

  const device = reportsAsAppleDevice() ? 'mac' : 'pc'
  return shortcuts?.[device]
}
