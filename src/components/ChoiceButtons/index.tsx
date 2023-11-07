import IVButton from '~/components/IVButton'
import ErrorMessage from '~/components/ErrorMessage'
import { ButtonConfig, ChoiceButtonConfig } from '@interval/sdk/dist/types'

type SubmittedChoice = {
  value: string
  label: string
  index: number
}

type ChoiceButtonsProps = {
  disabled: boolean
  isSubmitting: boolean
  submittedChoice?: SubmittedChoice | null
  onSubmit: (
    props: SubmittedChoice
  ) => (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
  validationErrorMessage?: string | undefined | null
  choices?: (Omit<ChoiceButtonConfig, 'theme'> & {
    theme?: ButtonConfig['theme'] | 'default'
  })[]
  continueButton?: Omit<ButtonConfig, 'theme'> & {
    theme?: ButtonConfig['theme'] | 'default'
  }
  extraLoadingMessage?: string
}

export default function ChoiceButtons({
  disabled,
  isSubmitting,
  submittedChoice,
  onSubmit,
  validationErrorMessage,
  choices,
  extraLoadingMessage,
}: ChoiceButtonsProps) {
  if (!choices || choices.length < 1) {
    choices = [{ label: 'Continue', theme: 'primary', value: 'Continue' }]
  }

  return (
    <div className="mt-6 space-y-4">
      {validationErrorMessage && (
        <div
          data-pw="form-error"
          className="bg-amber-50 px-3 pt-1 pb-3 rounded-md"
        >
          <ErrorMessage message={validationErrorMessage} />
        </div>
      )}
      <div className="flex gap-2 flex-wrap flex-row items-center">
        {choices.map((choice, index) => {
          const defaultTheme = index === 0 ? 'primary' : 'secondary'
          return (
            <IVButton
              key={index}
              shortcutKey={index === 0 ? 'Enter' : undefined}
              type={index === 0 ? 'submit' : 'button'}
              onClick={e =>
                onSubmit({
                  ...choice,
                  index,
                })(e)
              }
              label={choice.label}
              theme={
                choice.theme === 'default'
                  ? defaultTheme
                  : choice.theme ?? defaultTheme
              }
              disabled={disabled || isSubmitting}
              loading={isSubmitting && submittedChoice?.index === index}
              data-pw="continue-button"
            />
          )
        })}
        {isSubmitting && extraLoadingMessage && (
          <div className="inline pl-3 text-sm text-gray-500">
            <p className="inline ml-2">{extraLoadingMessage}...</p>
          </div>
        )}
      </div>
    </div>
  )
}
