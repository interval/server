import { memo } from 'react'

import { RCTResponderProps } from '~/components/RenderIOCall'
import RenderHTML from '~/components/RenderHTML'

const DisplayMarkdown = memo(function DisplayHTML({
  label,
  html,
}: RCTResponderProps<'DISPLAY_HTML'>) {
  return (
    <div className="space-y-2">
      <h4 className="form-label">{label}</h4>
      <RenderHTML html={html} />
    </div>
  )
})

export default DisplayMarkdown
