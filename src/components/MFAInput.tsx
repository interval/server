import { Field } from 'formik'
import IVInputField from '~/components/IVInputField'

export default function MFAInput({
  label = 'MFA code',
  isLoading,
}: {
  label?: string
  isLoading: boolean
}) {
  return (
    <IVInputField id="code" label={label}>
      <Field
        id="code"
        name="code"
        type="text"
        className="form-input"
        required
        readOnly={isLoading}
        inputMode="numeric"
        autoFocus
        pattern="[0-9]*"
        autoComplete="one-time-code"
      />
    </IVInputField>
  )
}
