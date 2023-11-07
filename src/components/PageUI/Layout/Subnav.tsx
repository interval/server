import { getCurrentPath } from '~/utils/url'
import classNames from 'classnames'
import Skeleton from 'react-loading-skeleton'
import { Link, NavLink } from 'react-router-dom'
import { getActionUrl, getName } from '~/utils/actions'
import { useOrgParams } from '~/utils/organization'
import {
  ActionGroupLookupResult,
  ActionGroupWithPossibleMetadata,
  ActionMode,
  ActionWithPossibleMetadata,
  NamedActionLike,
} from '~/utils/types'

function SubnavItem({
  item,
  orgEnvSlug,
  mode,
}: {
  orgEnvSlug: string
  mode: ActionMode
  item: NamedActionLike & { id: string }
  type: 'group' | 'action'
}) {
  return (
    <li key={item.id}>
      <NavLink
        to={getActionUrl({
          orgEnvSlug,
          mode,
          slug: item.slug,
        })}
        state={{ backPath: getCurrentPath() }}
        className={({ isActive }) =>
          classNames('block group py-1', {
            'text-primary-500 font-medium': isActive,
            'text-gray-700': !isActive,
          })
        }
        end
        data-pw-run-slug={item.slug}
      >
        <span className="group-hover:opacity-70">{getName(item)}</span>
      </NavLink>
    </li>
  )
}

export default function PageSubnav({
  title,
  mode,
  actionSlug,
  secondaryNav,
}: {
  title?: string | null
  mode: ActionMode
  actionSlug: string
  secondaryNav: ActionGroupLookupResult
}) {
  const { orgEnvSlug } = useOrgParams()

  // Note: do not filter items here; the parent component needs to know
  // if there are any items to render.
  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 tracking-[-0.01em] mb-2">
        <Link
          to={getActionUrl({
            orgEnvSlug,
            mode,
            slug: secondaryNav.slug,
          })}
          state={{ backPath: window.location.href }}
        >
          {title ?? <Skeleton width={80} />}
        </Link>
      </h3>

      <ul className="text-sm">
        {secondaryNav?.groups?.map(group => (
          <>
            <SubnavItem
              key={group.id}
              item={group}
              orgEnvSlug={orgEnvSlug}
              mode={mode}
              type="group"
            />
            {(group.actions.length > 0 || group.groups.length > 0) &&
              (actionSlug === group.slug ||
                actionSlug.substring(0, actionSlug.lastIndexOf('/')) ===
                  group.slug) && (
                <ul className="text-sm ml-3 pb-2" key={`${group.id}-children`}>
                  {group.groups.map(action => (
                    <SubnavItem
                      key={action.id}
                      item={action}
                      orgEnvSlug={orgEnvSlug}
                      mode={mode}
                      type="action"
                    />
                  ))}
                  {group.actions.map(action => (
                    <SubnavItem
                      key={action.id}
                      item={action}
                      orgEnvSlug={orgEnvSlug}
                      mode={mode}
                      type="action"
                    />
                  ))}
                </ul>
              )}
          </>
        ))}
        {secondaryNav?.actions?.map(action => (
          <SubnavItem
            key={action.id}
            item={action}
            orgEnvSlug={orgEnvSlug}
            mode={mode}
            type="action"
          />
        ))}
      </ul>
    </div>
  )
}
