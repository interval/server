import { useState, useEffect } from 'react'

export default function useDisableSelectionWithShiftKey() {
  const [isSelectingRange, setIsSelectingRange] = useState(false)

  useEffect(() => {
    function toggleIsSelectingRange(e: KeyboardEvent) {
      setIsSelectingRange(e.shiftKey)
    }

    document.addEventListener('keydown', toggleIsSelectingRange)
    document.addEventListener('keyup', toggleIsSelectingRange)

    return () => {
      document.removeEventListener('keydown', toggleIsSelectingRange)
      document.removeEventListener('keyup', toggleIsSelectingRange)
    }
  }, [])

  return isSelectingRange
}
