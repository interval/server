import classNames from 'classnames'
import { Link, useLocation } from 'react-router-dom'
import IconChevronRight from '~/icons/compiled/ChevronRight'
import { getActionUrl, getDashboardPath } from '~/utils/actions'
import { useOrgParams } from '~/utils/organization'
import { ActionsListProps } from './ActionsList'

export default function ActionsBreadcrumbs({
  breadcrumbs,
}: {
  breadcrumbs: { name: string; slug: string }[]
  mode?: ActionsListProps['mode']
}) {
  const { orgEnvSlug } = useOrgParams()
  const location = useLocation()

  const mode = location.pathname.startsWith(
    `/dashboard/${orgEnvSlug}/develop/actions`
  )
    ? 'console'
    : 'live'

  if (!breadcrumbs.length) return null

  return (
    <div className="text-sm text-gray-900">
      {breadcrumbs.map((breadcrumb, index) => {
        return (
          <span key={breadcrumb.slug}>
            {index === 0 && (
              <Link
                to={getDashboardPath({ orgEnvSlug, mode })}
                key="base"
                className="hover:opacity-70 text-gray-400"
              >
                Dashboard
              </Link>
            )}
            <span
              className="inline-block mx-2 relative top-px -left-px"
              key={`${index}-chevron`}
            >
              <IconChevronRight className="w-3 h-3 text-gray-400" />
            </span>
            {index === breadcrumbs.length - 1 ? (
              <span>{breadcrumb.name}</span>
            ) : (
              <Link
                to={getActionUrl({
                  orgEnvSlug,
                  mode,
                  slug: breadcrumb.slug,
                })}
                key={index}
                className={classNames('hover:opacity-70', {
                  'text-gray-900': index === breadcrumbs.length - 1,
                  'text-gray-400': index !== breadcrumbs.length - 1,
                })}
              >
                {breadcrumb.name}
              </Link>
            )}
          </span>
        )
      })}
    </div>
  )
}
