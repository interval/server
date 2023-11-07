import React, { useState, useEffect } from 'react'
import { toast as notify } from 'react-hot-toast'

export default function useCopyToClipboard(opts?: {
  successMessage?: string
  target?: React.RefObject<HTMLDivElement | null>
}) {
  const [isCopied, setIsCopied] = useState<boolean>(false)
  const { successMessage, target } = opts || {}

  function onCopyClick(value: string) {
    // using a different target element may be necessary, e.g. if the input is in a modal
    // and focusing an element outside of the modal will close it.
    const targetEl = target?.current || document.body

    if (isCopied || !targetEl) {
      return
    }

    const input = document.createElement('textarea')
    input.className = 'sr-only'
    input.innerHTML = value

    // preserves spaces and line breaks
    input.style.whiteSpace = 'pre'

    targetEl.appendChild(input)

    input.select()
    document.execCommand('copy')
    setIsCopied(true)

    targetEl.removeChild(input)
  }

  useEffect(() => {
    if (!isCopied) {
      return
    }

    const t = setTimeout(() => setIsCopied(false), 3000)

    return () => clearTimeout(t)
  }, [isCopied])

  useEffect(() => {
    if (successMessage && isCopied) {
      notify.success(successMessage)
    }
  }, [successMessage, isCopied])

  return { isCopied, onCopyClick }
}
