import { RCTResponderProps } from '~/components/RenderIOCall'
import { imageSizeToPx } from '~/utils/number'
import classNames from 'classnames'

export default function DisplayVideo(
  props: RCTResponderProps<'DISPLAY_VIDEO'>
) {
  return (
    <div className="space-y-2">
      <h4 className="form-label">{props.label}</h4>
      <video
        data-pw-display-video
        controls
        src={props.url}
        muted={props.muted}
        loop={props.loop}
        width={props.width ? imageSizeToPx(props.width) : undefined}
        height={props.height ? imageSizeToPx(props.height) : undefined}
        className={classNames('object-contain bg-black', {
          'max-w-img-thumbnail': props.width === 'thumbnail',
          'max-w-img-small': props.width === 'small',
          'max-w-img-medium': props.width === 'medium',
          'max-w-img-large': props.width === 'large',
          'max-h-img-thumbnail': props.height === 'thumbnail',
          'max-h-img-small': props.height === 'small',
          'max-h-img-medium': props.height === 'medium',
          'max-h-img-large': props.height === 'large',
        })}
      />
    </div>
  )
}
