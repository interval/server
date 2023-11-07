import { memo } from 'react'
import dedent from 'ts-dedent'

import { RCTResponderProps } from '~/components/RenderIOCall'
import RenderMarkdown from '~/components/RenderMarkdown'

const DisplayMarkdown = memo(function DisplayMarkdown({
  label,
}: RCTResponderProps<'DISPLAY_MARKDOWN'>) {
  return (
    <div className="prose prose-sm prose-h1:text-2xl prose-a:text-blue-600 hover:prose-a:text-blue-500 prose-a:no-underline prose-headings:mb-[0.5em] max-w-none">
      <RenderMarkdown value={dedent(label)} />
    </div>
  )
})

export default DisplayMarkdown
