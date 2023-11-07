export default function throttle<R, Args extends any[]>(
  callback: (...args: Args) => R,
  timeoutMs: number
): (...args: Args) => R {
  let inThrottle = false
  let prevValue: R | undefined

  return (...args: Args) => {
    if (inThrottle) return prevValue as R

    inThrottle = true
    prevValue = callback(...args)
    setTimeout(() => {
      inThrottle = false
    }, timeoutMs)
    return prevValue as R
  }
}
