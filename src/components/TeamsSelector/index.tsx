import { useFormikContext } from 'formik'
import { UserAccessGroup } from '@prisma/client'
import IVInputField from '~/components/IVInputField'
import IVCheckbox from '~/components/IVCheckbox'

export interface TeamsSelectorProps {
  label?: string
  name: string
  helpText?: string
  teams: Pick<UserAccessGroup, 'id' | 'name'>[]
  disabled?: boolean
}

export default function TeamsSelectorProps({
  label = 'Teams',
  name,
  helpText,
  teams,
  disabled,
}: TeamsSelectorProps) {
  const { values, setFieldValue } = useFormikContext<{
    groupIds: string[]
  }>()

  if (!teams.length) return null

  return (
    <div>
      <IVInputField label={label} id={name} helpText={helpText}>
        <div className="space-y-2 pt-1">
          {teams.map(team => (
            <IVCheckbox
              label={team.name}
              value={team.id}
              key={team.id}
              id={team.id}
              disabled={disabled}
              checked={values.groupIds.includes(team.id)}
              onChange={e => {
                if (e.currentTarget.checked) {
                  setFieldValue('groupIds', [...values.groupIds, team.id])
                  return
                }

                setFieldValue(
                  'groupIds',
                  values.groupIds.filter(t => t !== team.id)
                )
              }}
            />
          ))}
        </div>
      </IVInputField>
    </div>
  )
}
