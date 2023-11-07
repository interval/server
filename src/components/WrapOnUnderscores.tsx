import { useMemo } from 'react'

export default function WrapOnUnderscores({ label }: { label: string }) {
  const pieces = useMemo(() => label.split('_'), [label])
  return (
    <>
      {pieces.map((piece, i) => (
        <span key={piece}>
          {piece}
          {i < pieces.length - 1 && (
            <>
              <wbr />_
            </>
          )}
        </span>
      ))}
    </>
  )
}
