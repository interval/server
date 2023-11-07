import { useParams } from 'react-router-dom'
import classNames from 'classnames'
import { ActionMode } from '~/utils/types'
import { useSubnavState } from '~/utils/useDashboardStructure'
import PageSubnav from '../PageUI/Layout/Subnav'

export default function PageLayout({
  children,
  mode,
}: {
  children: React.ReactNode
  mode: ActionMode
}) {
  const params = useParams<{ '*': string }>()
  const actionSlug = params['*'] as string
  const navState = useSubnavState({ mode, actionSlug })

  return (
    <div
      className={classNames('flex-1 grid grid-cols-1', {
        'lg:grid-cols-[200px_minmax(0,1fr)] gap-4': navState.hasSubnav,
      })}
    >
      {navState.hasSubnav && navState.secondaryNav && (
        <div className="hidden lg:block p-4 sm:p-6">
          <div className="sticky top-6">
            <PageSubnav
              mode={mode}
              actionSlug={actionSlug}
              {...navState}
              secondaryNav={navState.secondaryNav}
            />
          </div>
        </div>
      )}
      {children}
    </div>
  )
}
