import { RCTResponderProps } from '~/components/RenderIOCall'
import classNames from 'classnames'

export default function DisplayImage(
  props: RCTResponderProps<'DISPLAY_IMAGE'>
) {
  return (
    <div className="space-y-2">
      <h4 className="form-label">{props.label}</h4>
      <img
        src={props.url}
        alt={props.alt}
        data-pw-display-image
        className={classNames('object-contain', {
          'w-img-thumbnail': props.width === 'thumbnail',
          'w-img-small': props.width === 'small',
          'w-img-medium': props.width === 'medium',
          'w-img-large': props.width === 'large',
          'h-img-thumbnail': props.height === 'thumbnail',
          'h-img-small': props.height === 'small',
          'h-img-medium': props.height === 'medium',
          'h-img-large': props.height === 'large',
        })}
      />
    </div>
  )
}
