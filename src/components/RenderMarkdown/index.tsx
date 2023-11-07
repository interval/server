import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import classNames from 'classnames'

import HighlightedCodeBlock from '~/components/HighlightedCodeBlock'

const REMARK_PLUGINS = [remarkGfm]

export const ALLOWED_INLINE_ELEMENTS = [
  'p',
  'br',
  'b',
  'strong',
  'i',
  'em',
  'a',
  'code',
  'ul',
  'ol',
  'li',
]

export default function RenderMarkdown({
  value,
  showCodeControls,
  allowedElements,
}: {
  value: string
  showCodeControls?: boolean
  allowedElements?: string[]
}) {
  return (
    <Markdown
      children={value}
      linkTarget="_blank"
      remarkPlugins={REMARK_PLUGINS}
      allowedElements={allowedElements}
      unwrapDisallowed={true}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          return !inline &&
            match &&
            children.length &&
            typeof children[0] === 'string' ? (
            <HighlightedCodeBlock
              theme="light"
              className={className}
              {...props}
              code={children[0]}
              language={match[1]}
              canCopy={showCodeControls}
              canDownload={showCodeControls}
            />
          ) : (
            <code
              className={classNames(className, {
                hljs: !inline,
              })}
              {...props}
            >
              {children}
            </code>
          )
        },
      }}
    />
  )
}
