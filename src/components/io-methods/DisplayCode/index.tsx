import { RCTResponderProps } from '~/components/RenderIOCall'
import HighlightedCodeBlock from '~/components/HighlightedCodeBlock'

export default function DisplayCode(props: RCTResponderProps<'DISPLAY_CODE'>) {
  return (
    <figure>
      <legend className="form-label">{props.label}</legend>
      <div className="bg-gray-50 border rounded">
        <HighlightedCodeBlock
          theme="light"
          fileName={props.label}
          code={props.code}
          language={props.language}
          shouldDisplayFileName={false}
          shouldReplacePackageManager={false}
        />
      </div>
    </figure>
  )
}
