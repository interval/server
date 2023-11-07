import { useMemo } from 'react'
import sanitizeHtml, { IOptions } from 'sanitize-html'

interface RenderHTMLProps {
  html: string
}

const config: IOptions = {
  allowedTags: [
    'address',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'nav',
    'blockquote',
    'div',
    'hr',
    'li',
    'ol',
    'p',
    'pre',
    'ul',
    'a',
    'abbr',
    'b',
    'bdi',
    'bdo',
    'br',
    'cite',
    'code',
    'data',
    'dfn',
    'em',
    'i',
    'kbd',
    'mark',
    'q',
    'rb',
    'rp',
    'rt',
    'rtc',
    'ruby',
    's',
    'samp',
    'small',
    'span',
    'strong',
    'time',
    'u',
    'var',
    'wbr',
    'caption',
    'img',
    'video',
    'picture',
  ],
  nonTextTags: [
    'style',
    'script',
    'textarea',
    'option',
    'noscript',
    'button',
    'iframe',
  ],
}

export default function RenderHTML(props: RenderHTMLProps) {
  const { html } = props

  const sanitized = useMemo(() => {
    return sanitizeHtml(html, config)
  }, [html])

  return (
    <div
      className="prose prose-sm prose-h1:text-2xl prose-a:text-blue-600 hover:prose-a:text-blue-500 prose-a:no-underline prose-headings:mb-[0.5em] max-w-none"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    ></div>
  )
}
