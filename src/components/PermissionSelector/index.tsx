import { useFormikContext } from 'formik'
import { UserAccessPermission } from '@prisma/client'
import IVInputField from '~/components/IVInputField'
import IVSelect from '~/components/IVSelect'
import { EXPOSED_ROLES } from '~/utils/permissions'
import { userAccessPermissionToString } from '~/utils/text'

export interface PermissionSelectorProps {
  label?: string
  name: string
  helpText?: string
  disabled?: boolean
  isOwner?: boolean
  isUser?: boolean
  allowEmpty?: boolean
}

export default function PermissionSelector({
  label = 'Role',
  name,
  helpText,
  disabled,
  isOwner,
  isUser,
  allowEmpty = false,
}: PermissionSelectorProps) {
  const { values, setFieldValue } = useFormikContext<{
    role: UserAccessPermission | ''
  }>()

  return (
    <div>
      <IVInputField
        label={label}
        id={name}
        constraints={
          <>
            <a
              className="text-primary-500 font-medium hover:opacity-60"
              href="https://interval.com/docs/writing-actions/authentication#roles"
              target="_blank"
            >
              Learn more
            </a>{' '}
            about the different access levels of Interval roles
          </>
        }
        helpText={
          helpText ??
          (isUser
            ? 'You cannot edit your own permissions.'
            : isOwner
            ? "You cannot edit the organization owner's permissions."
            : undefined)
        }
      >
        <IVSelect
          id={name}
          name={name}
          disabled={disabled || isOwner || isUser}
          value={values.role}
          className="inline-block w-auto"
          options={EXPOSED_ROLES.map(role => ({
            label: userAccessPermissionToString(role),
            value: role,
          }))}
          defaultLabel={allowEmpty ? '(No additional permission)' : undefined}
          onChange={e => setFieldValue('role', e.target.value)}
        />
      </IVInputField>
    </div>
  )
}
