import React, { useState, useEffect } from 'react'

export default function DotsSpinner() {
  const [value, setValue] = useState<[number, string]>([0, '⠋'])

  useEffect(() => {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

    const t = setInterval(function () {
      setValue(([frame]) => {
        frame = frame + 1 === frames.length ? 0 : frame + 1
        return [frame, frames[frame]]
      })
    }, 80)

    return () => clearInterval(t)
  }, [])

  return <>{value[1]}</>
}
