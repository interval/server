import { useCallback } from 'react'
import { Field, Form, Formik } from 'formik'
import { inferQueryOutput, inferMutationInput, trpc } from '~/utils/trpc'
import IVInputField from '~/components/IVInputField'
import IVTextInput from '~/components/IVTextInput'
import IVTextArea from '~/components/IVTextArea'
import { slugToName } from '~/utils/text'
import IVButton from '~/components/IVButton'
import IconInfo from '~/icons/compiled/Info'
import IVCheckbox from '~/components/IVCheckbox'
import { useDialogState } from '~/components/IVDialog'
import ArchiveDialog from '~/components/ActionSettings/ArchiveDialog'
import IVAlert from '~/components/IVAlert'
import { useIsFeatureEnabled } from '~/utils/useIsFeatureEnabled'

function OverrideMetaTextField({
  id,
  label,
  helpText,
  errorMessage,
  metaValue,
  actionValue,
  defaultValue = '',
  placeholder,
  disabled,
  onChange,
  multiline = false,
}: {
  id: string
  label: string
  errorMessage?: React.ReactNode
  helpText?: string
  metaValue: string | null | undefined
  actionValue: string | null | undefined
  defaultValue?: string
  placeholder?: string
  disabled?: boolean
  onChange: (value: string | null) => void
  multiline?: boolean
}) {
  const isOverriding = metaValue != null
  const InputComponent = multiline ? IVTextArea : IVTextInput

  return (
    <IVInputField
      label={label}
      helpText={helpText}
      id={id}
      errorMessage={errorMessage}
    >
      <>
        <InputComponent
          id={id}
          name={id}
          value={metaValue ?? actionValue ?? defaultValue}
          onChange={(
            e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>
          ) => {
            if (disabled) return

            onChange(e.target.value)
          }}
          readOnly={!!actionValue && !isOverriding}
          disabled={disabled || (!!actionValue && !isOverriding)}
          placeholder={placeholder}
        />
        {!disabled && actionValue != null && (
          <OverrideNotice
            label={
              isOverriding
                ? 'This is overriding the value specified in its action definition.'
                : 'This value is specified by the action definition code.'
            }
            buttonLabel={isOverriding ? 'Remove the override' : 'Override it'}
            onClick={() => {
              onChange(isOverriding ? null : actionValue ?? defaultValue)
            }}
          />
        )}
      </>
    </IVInputField>
  )
}

function OverrideMetaToggleField({
  id,
  label,
  helpText,
  metaValue,
  actionValue,
  defaultValue,
  disabled,
  onChange,
}: {
  id: string
  label: string
  helpText?: string
  metaValue: boolean | null | undefined
  actionValue: boolean | null | undefined
  defaultValue: false
  disabled?: boolean
  onChange: (value: boolean | null) => void
}) {
  const isOverriding = metaValue != null
  return (
    <div>
      <IVCheckbox
        id={id}
        label={label}
        helpText={helpText}
        checked={metaValue ?? actionValue ?? defaultValue}
        onChange={e => {
          if (disabled) return
          onChange(e.target.checked)
        }}
        disabled={disabled || !isOverriding}
      />
      {!disabled && actionValue != null && (
        <OverrideNotice
          label={
            isOverriding
              ? 'This is overriding the value specified in its action definition.'
              : 'This value is specified by the action definition code.'
          }
          buttonLabel={isOverriding ? 'Remove the override' : 'Override it'}
          onClick={() => {
            onChange(isOverriding ? null : actionValue ?? defaultValue)
          }}
        />
      )}
    </div>
  )
}

function OverrideNotice({ label, buttonLabel, onClick }) {
  return (
    <div className="text-sm flex items-start text-gray-500 mt-1">
      <div className="w-4 mr-3 flex justify-center">
        <IconInfo className="w-3 h-3 mt-1 rounded-full text-primary-200" />
      </div>
      <p>
        <span className="inline-block mr-1.5">{label}</span>
        <button
          className="text-primary-500 font-medium hover:opacity-70"
          type="button"
          onClick={() => onClick()}
        >
          {buttonLabel}
        </button>
      </p>
    </div>
  )
}

export default function ActionGeneralSettings({
  action,
  onSuccess,
  onError,
  refetch,
}: {
  action: inferQueryOutput<'action.one'>
  onSuccess: () => void
  onError: () => void
  refetch: () => void
}) {
  const archiveDialog = useDialogState()

  const updateMeta = trpc.useMutation('action.general.update')
  const generalConfigEnabled = useIsFeatureEnabled(
    'ACTION_METADATA_GENERAL_CONFIG'
  )

  const validateName = useCallback(
    (name: string | undefined | null) => {
      name = name?.trim()

      if (action.name && !name) return

      if (!name) {
        return 'Please enter a name.'
      }
    },
    [action]
  )

  const isArchived = action.metadata?.archivedAt

  return (
    <div>
      {isArchived && (
        <IVAlert theme="info" icon={IconInfo} className="mb-4">
          <p>
            This action has been archived.{` `}
            <button
              className="inline font-semibold hover:opacity-70"
              onClick={() => archiveDialog.show()}
            >
              Unarchive this action
            </button>{' '}
            to restore it to your Actions list.
          </p>
        </IVAlert>
      )}

      {!generalConfigEnabled && (
        <p className="py-3 mb-4 text-md">
          Actions are configured in code. See{' '}
          <a
            href="https://interval.com/docs/writing-actions/#defining-actions"
            className="font-medium text-primary-500 hover:opacity-60"
            target="_blank"
          >
            defining actions documentation
          </a>{' '}
          for more information.
        </p>
      )}

      <Formik<inferMutationInput<'action.general.update'>['data']>
        initialTouched={{
          name: true,
        }}
        initialValues={{
          name:
            action.metadata?.name ??
            (action.name ? undefined : slugToName(action.slug)),
          backgroundable: action.metadata?.backgroundable,
          description: action.metadata?.description,
        }}
        validateOnBlur={false}
        validateOnChange={false}
        validate={({ name }) => {
          const nameValidation = validateName(name)
          if (nameValidation) {
            return {
              name: nameValidation,
            }
          }
        }}
        onSubmit={async data => {
          if (updateMeta.isLoading || !generalConfigEnabled) return

          if (
            action.schedules.length &&
            (data.backgroundable === false ||
              (!action.backgroundable && !data.backgroundable))
          ) {
            if (
              !window.confirm(
                "Turning off 'Allow running in background' will remove this action's schedule. Are you sure you want to turn off this setting?"
              )
            ) {
              return
            }
          }

          updateMeta.mutate(
            { actionId: action.id, data },
            { onSuccess, onError }
          )
        }}
      >
        {({ errors, touched, isValid, values, setFieldValue }) => (
          <Form>
            <div className="mb-6 space-y-8">
              <div className="space-y-4">
                <IVInputField
                  label="Slug"
                  helpText={
                    generalConfigEnabled
                      ? "An action's slug can only be changed in code."
                      : undefined
                  }
                  id="slug"
                >
                  <Field
                    type="text"
                    name="slug"
                    id="slug"
                    value={action.slug}
                    className="form-input font-mono"
                    readOnly
                    disabled
                  />
                </IVInputField>

                <OverrideMetaTextField
                  label="Name"
                  id="name"
                  errorMessage={
                    errors.name && touched.name ? errors.name : undefined
                  }
                  placeholder="What is this called?"
                  disabled={!generalConfigEnabled || updateMeta.isLoading}
                  metaValue={values.name}
                  actionValue={action.name}
                  onChange={val => {
                    setFieldValue('name', val)
                  }}
                />
                <OverrideMetaTextField
                  label="Description"
                  id="description"
                  placeholder="What does this do?"
                  disabled={!generalConfigEnabled || updateMeta.isLoading}
                  metaValue={values.description}
                  actionValue={action.description}
                  onChange={val => {
                    setFieldValue('description', val)
                  }}
                  multiline
                />
              </div>
            </div>

            <OverrideMetaToggleField
              id="backgroundable"
              label="Allow running in background"
              helpText="Background actions will continue running until completed or canceled, even if you leave the page."
              metaValue={values.backgroundable}
              actionValue={action.backgroundable}
              disabled={!generalConfigEnabled || updateMeta.isLoading}
              defaultValue={false}
              onChange={val => {
                setFieldValue('backgroundable', val)
              }}
            />

            <div className="flex justify-between items-center mt-12">
              {generalConfigEnabled ? (
                <IVButton
                  loading={updateMeta.isLoading}
                  disabled={!isValid}
                  type="submit"
                  label={'Save changes'}
                />
              ) : (
                /* Just to make the flex still work */ <div></div>
              )}
              {!isArchived && (
                <div className="-mr-4">
                  <IVButton
                    theme="plain"
                    className="hover:opacity-70 text-red-500"
                    onClick={archiveDialog.show}
                    label="Archive"
                  />
                </div>
              )}
            </div>

            {updateMeta.isError && (
              <div className="px-4 py-3 text-sm font-medium text-red-800 rounded-md bg-red-50">
                Sorry, there was a problem updating the action.
              </div>
            )}
          </Form>
        )}
      </Formik>

      <ArchiveDialog
        actionId={action.id}
        onSuccess={refetch}
        dialog={archiveDialog}
        mode={isArchived ? 'unarchive' : 'archive'}
      />
    </div>
  )
}
