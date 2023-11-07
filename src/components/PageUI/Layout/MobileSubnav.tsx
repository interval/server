import { getCurrentPath } from '~/utils/url'
import { useNavigate } from 'react-router-dom'
import { getActionUrl, getName } from '~/utils/actions'
import { useOrgParams } from '~/utils/organization'
import { ActionGroupLookupResult, ActionMode } from '~/utils/types'

export default function MobilePageSubnav({
  title,
  mode,
  secondaryNav,
}: {
  title?: string | null
  mode: ActionMode
  secondaryNav?: ActionGroupLookupResult | null
}) {
  const { orgEnvSlug } = useOrgParams()
  const navigate = useNavigate()

  return (
    <div>
      <select
        className="block w-full form-select"
        onChange={e =>
          navigate(e.target.value, {
            state: { backPath: getCurrentPath() },
          })
        }
        value="default"
      >
        <option value="default" disabled>
          {title} menu
        </option>
        {secondaryNav?.actions?.map(action => (
          <option
            key={action.id}
            value={getActionUrl({
              orgEnvSlug,
              mode,
              slug: action.slug,
            })}
          >
            {getName(action)}
          </option>
        ))}
        {!!secondaryNav?.groups.length && (
          <optgroup label="More">
            {secondaryNav?.groups?.map(group => (
              <>
                <option
                  key={group.id}
                  value={getActionUrl({
                    orgEnvSlug,
                    mode,
                    slug: group.slug,
                  })}
                >
                  {getName(group)}
                </option>
                {group.actions.length > 0 &&
                  group.actions.map(action => (
                    <option
                      key={action.id}
                      value={getActionUrl({
                        orgEnvSlug,
                        mode,
                        slug: action.slug,
                      })}
                    >
                      &nbsp;&nbsp;&nbsp; {getName(action)}
                    </option>
                  ))}
              </>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  )
}
