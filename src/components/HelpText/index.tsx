import classNames from 'classnames'
import RenderMarkdown, { ALLOWED_INLINE_ELEMENTS } from '../RenderMarkdown'

export interface ComponentHelpTextProps {
  id?: string
  className?: string
  children: string | React.ReactNode
}

export default function ComponentHelpText(props: ComponentHelpTextProps) {
  const isMarkdown = typeof props.children === 'string'

  return (
    <div
      className={classNames('text-sm text-gray-500', props.className ?? '', {
        'prose-inline': isMarkdown,
      })}
      id={props.id}
    >
      {isMarkdown ? (
        <RenderMarkdown
          value={props.children as string}
          allowedElements={ALLOWED_INLINE_ELEMENTS}
        />
      ) : (
        props.children
      )}
    </div>
  )
}
