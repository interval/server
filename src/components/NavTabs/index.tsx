import classNames from 'classnames'
import { NavLink, useSearchParams } from 'react-router-dom'

export interface NavTab {
  path: string
  tab?: string | null
  label: string
  enabled?: boolean
}

export default function NavTabs({ tabs }: { tabs: NavTab[] }) {
  const [searchParams] = useSearchParams()

  return (
    <div className="flex items-center space-x-1 overflow-x-auto">
      {tabs
        .filter(tab => tab.enabled !== false)
        .map(tab => (
          <NavLink
            end
            to={tab.path}
            key={tab.label}
            className={({ isActive }) =>
              classNames(
                'text-sm focus:outline-none font-semibold px-2 sm:px-3 py-1.5 rounded-md',
                {
                  'bg-primary-50 bg-opacity-70 text-primary-500':
                    tab.tab !== undefined
                      ? searchParams.get('tab') === tab.tab
                      : isActive,
                  'text-gray-800 hover:bg-gray-50': !(tab.tab !== undefined
                    ? searchParams.get('tab') === tab.tab
                    : isActive),
                }
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
    </div>
  )
}
