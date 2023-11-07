import { StoryFn } from '@storybook/react'
import IVCheckbox from '~/components/IVCheckbox'
import IVInputField from '~/components/IVInputField'
import IVSelect from '~/components/IVSelect'
import IVTextInput from '~/components/IVTextInput'

function FormValidationExamples() {
  return (
    <div className="max-w-screen-lg mx-auto min-h-screen flex items-center justify-center">
      <div className="space-y-5 w-[400px]">
        <IVInputField
          id="name"
          label="Full name"
          errorMessage="This field is required."
        >
          <IVTextInput name="name" />
        </IVInputField>
        <IVInputField id="email" label="Email address">
          <IVTextInput name="email" id="email" />
        </IVInputField>
        <IVInputField id="company" label="Company" optional>
          <IVTextInput name="company" />
        </IVInputField>
        <IVInputField id="disabled" label="Disabled field">
          <IVTextInput name="disabled" disabled />
        </IVInputField>
        <IVInputField
          id="password"
          label="Initial password"
          constraints="Must be at least 8 characters"
          helpText="Password will be reset upon first login."
        >
          <IVTextInput type="password" name="password" />
        </IVInputField>
        <IVInputField
          id="source"
          label="How did you find out about us?"
          optional
        >
          <IVSelect
            name="source"
            defaultLabel="Select an option..."
            options={[
              { label: 'Radio', value: 'radio' },
              { label: 'TV', value: 'tv' },
              { label: 'Newspaper', value: 'newspaper' },
            ]}
          />
        </IVInputField>
        <IVCheckbox
          name="subscribe"
          id="subscribe"
          label="Subscribe to our newsletter"
        />
      </div>
    </div>
  )
}

export default {
  title: 'Examples/FormValidation',
  component: FormValidationExamples,
}

const Template: StoryFn<typeof FormValidationExamples> = () => (
  <FormValidationExamples />
)

export const Default = Template.bind({})
