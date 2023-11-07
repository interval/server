import classNames from 'classnames'
import { TextareaHTMLAttributes } from 'react'

type IVTextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export default function IVTextArea(props: IVTextAreaProps) {
  const { className, ...rest } = props

  return (
    <textarea
      {...rest}
      id={props.id ?? props.name}
      className={classNames('form-input', className)}
    />
  )
}
