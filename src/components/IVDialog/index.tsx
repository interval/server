import classNames from 'classnames'
import {
  Dialog as ReakitDialog,
  DialogDisclosure,
  DialogBackdrop,
  DialogInitialState,
  DialogStateReturn,
  useDialogState as default_useDialogState,
} from 'reakit'
import CancelIcon from '~/icons/compiled/Cancel'
import RenderMarkdown, { ALLOWED_INLINE_ELEMENTS } from '../RenderMarkdown'

export type IVDialogProps = {
  dialog: DialogStateReturn
  children: React.ReactNode
  canClose?: boolean
  widthClassName?: string
  backdropClassName?: string
  renderChildrenWhileHidden?: boolean
} & (
  | {
      // One of these props is required for an accessibility title.
      // Use `title` to show as the modal header. Use `aria-label` to hide the title.
      title: string
      'aria-label'?: string
    }
  | {
      title?: string
      'aria-label': string
    }
)

export function useDialogState(state?: DialogInitialState) {
  return default_useDialogState({
    ...state,
    animated: 200,
  })
}

// Wraps buttons that open a dialog. Reakit will complain if you don't use these, because
// it can't identify the element to return focus to when you close the dialog.
export function IVDialogDisclosure({
  children,
  ...props
}: DialogStateReturn & { children: React.ReactNode }) {
  return (
    <DialogDisclosure
      {...props}
      // the trigger element is typically a button, and a button can't appear within a button.
      // note: can't use `as={IVButton}` here because it will complain about being unable to access refs.
      as="span"
      // prevents this element from auto-focusing. we want the child element to receive the focus.
      tabIndex={-1}
      focusable={false}
      className="focus:outline-none"
    >
      {children}
    </DialogDisclosure>
  )
}

export function IVDialogActions(props: {
  children: React.ReactNode
  className?: string
}) {
  const { className = 'mt-6' } = props

  return (
    <div className={`flex justify-end items-center space-x-2 ${className}`}>
      {props.children}
    </div>
  )
}

export default function IVDialog(props: IVDialogProps) {
  const {
    title,
    children,
    dialog,
    widthClassName = 'w-[400px]',
    canClose = true,
    'aria-label': ariaLabel,
    renderChildrenWhileHidden = false,
    backdropClassName = 'fixed z-30 inset-0 overflow-y-auto transition-all transform duration-200 outline-none dialog-backdrop--shade',
  } = props

  return (
    <>
      <DialogBackdrop
        {...dialog}
        className={backdropClassName}
        modal={dialog.modal}
      >
        <div
          data-iv-dialog
          className={classNames(
            'flex items-center justify-center text-center',
            {
              'min-h-screen-ios': dialog.modal,
            }
          )}
        >
          <ReakitDialog
            {...props.dialog}
            className={[
              'dialog outline-none transform transition-all duration-200',
            ].join(' ')}
            hideOnEsc={canClose}
            hideOnClickOutside={canClose}
            aria-label={title || ariaLabel}
            preventBodyScroll={false}
          >
            <div
              className={classNames(
                'inline-block bg-white rounded-lg p-6 text-left shadow-xl transform transition-all sm:my-8 sm:align-middle max-w-full',
                widthClassName || 'sm:max-w-lg sm:w-full'
              )}
            >
              {canClose && (
                <div className="hidden sm:block absolute top-0 right-0 pt-4 pr-4">
                  <button
                    type="button"
                    className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    onClick={props.dialog.hide}
                  >
                    <span className="sr-only">Close</span>
                    <CancelIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              )}
              <div>
                <div className="text-left">
                  {props.title && (
                    <h3 className="text-xl leading-6 font-semibold text-gray-900 mb-4 pr-5 hyphenate">
                      {props.title}
                    </h3>
                  )}
                  <div className="text-sm text-gray-700 whitespace-pre-line hyphenate">
                    {(renderChildrenWhileHidden ||
                      dialog.animating ||
                      dialog.visible) && (
                      <>
                        {typeof children === 'string' ? (
                          <RenderMarkdown
                            value={children}
                            allowedElements={ALLOWED_INLINE_ELEMENTS}
                          />
                        ) : (
                          children
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </ReakitDialog>
        </div>
      </DialogBackdrop>
    </>
  )
}
