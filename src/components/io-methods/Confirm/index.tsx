import { RCTResponderProps } from '~/components/RenderIOCall'
import IVButton from '~/components/IVButton'
import IVDialog, { useDialogState } from '~/components/IVDialog'
import XCircleIcon from '~/icons/compiled/XCircle'
import ErrorCircleIcon from '~/icons/compiled/ErrorCircle'
import CheckCircleIcon from '~/icons/compiled/CheckCircleOutline'
import RenderMarkdown, {
  ALLOWED_INLINE_ELEMENTS,
} from '~/components/RenderMarkdown'

const AFFIRMATIVE_RESPONSE_LABEL = 'Confirm'
const NEGATIVE_RESPONSE_LABEL = 'Cancel'

function InlineConfirmPrompt(
  props: RCTResponderProps<'CONFIRM'> & {
    onRespond: (value: boolean) => void
  }
) {
  if (props.isCurrentCall === false) {
    const Icon = props.value ? CheckCircleIcon : XCircleIcon

    return (
      <div>
        <h3 className="text-sm font-medium mb-4 text-gray-800">
          {props.label}
        </h3>
        <div className="text-sm text-gray-700 font-medium flex items-center cursor-default">
          <Icon className="w-5 h-5 mr-1.5" />
          <span>
            {props.value ? AFFIRMATIVE_RESPONSE_LABEL : NEGATIVE_RESPONSE_LABEL}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg inline-flex text-sm items-start" data-io-confirm>
      <div className="flex-none">
        <ErrorCircleIcon className="w-5 h-5 text-primary-500 relative -top-px" />
      </div>
      <div className="pl-3 flex-1">
        <h3 className="font-medium mb-1 text-gray-800">{props.label}</h3>
        {props.helpText && (
          <div className="text-left mt-2 mb-2 prose-inline">
            <RenderMarkdown value={props.helpText} />
          </div>
        )}
        <div className="inline-flex items-start space-x-2 mt-3">
          <IVButton
            theme="primary"
            label={AFFIRMATIVE_RESPONSE_LABEL}
            onClick={() => props.onRespond(true)}
            disabled={props.isSubmitting}
            loading={props.isSubmitting && props.value === true}
            autoFocus
          />
          <IVButton
            theme="secondary"
            label={NEGATIVE_RESPONSE_LABEL}
            onClick={() => props.onRespond(false)}
            disabled={props.isSubmitting}
            loading={props.isSubmitting && props.value === false}
          />
        </div>
      </div>
    </div>
  )
}

export default function Confirm(props: RCTResponderProps<'CONFIRM'>) {
  const dialog = useDialogState({
    visible: !props.disabled && !props.shouldUseAppendUi,
    // non-modals are rendered within their parent component, not a <Portal>
    modal: props.context === 'transaction',
  })

  const onRespond = (value: boolean) => {
    props.onUpdatePendingReturnValue(value)
    if (props.context !== 'docs') dialog.hide()
  }

  if (props.shouldUseAppendUi) {
    return (
      <div className="max-w-[500px]">
        <InlineConfirmPrompt {...props} onRespond={onRespond} />
      </div>
    )
  }

  return (
    <IVDialog
      canClose={false}
      dialog={dialog}
      aria-label={props.label}
      widthClassName={
        props.helpText ? 'sm:max-w-sm sm:w-full' : 'sm:max-w-xs sm:w-full'
      }
      backdropClassName={props.context === 'docs' ? '' : undefined}
      title={props.label}
    >
      {props.helpText && (
        <div className="mb-6 whitespace-pre-line text-sm prose-inline">
          <RenderMarkdown
            value={props.helpText}
            allowedElements={ALLOWED_INLINE_ELEMENTS}
          />
        </div>
      )}
      <div className="grid gap-2 grid-cols-2 mt-6" data-io-confirm>
        <IVButton
          theme="primary"
          label={AFFIRMATIVE_RESPONSE_LABEL}
          onClick={() => onRespond(true)}
          autoFocus
        />
        <IVButton
          theme="secondary"
          label={NEGATIVE_RESPONSE_LABEL}
          onClick={() => onRespond(false)}
        />
      </div>
    </IVDialog>
  )
}
