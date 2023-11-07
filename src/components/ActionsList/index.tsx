import classNames from 'classnames'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRecoilState } from 'recoil'
import IconCaretDown from '~/icons/compiled/CaretDown'
import { useOrgParams } from '~/utils/organization'
import { pluralize, pluralizeWithCount } from '~/utils/text'
import {
  ActionMode,
  ActionLookupResult,
  ActionGroupLookupResult,
} from '~/utils/types'
import ListViewToggle, { actionsListViewMode } from '../ListViewToggle'
import ActionsListGroup from './ActionsListGroup'
import ActionsListItem from './ActionsListItem'
export interface ActionsListProps {
  mode: ActionMode | 'anon-console'
  canRun?: boolean
  canConfigure?: boolean
  actions: ActionLookupResult[]
  archivedActions: ActionLookupResult[]
  groups?: ActionGroupLookupResult[]
  slugPrefix?: string
  showFullSlug?: boolean
}

export default function ActionsList(props: ActionsListProps) {
  const { orgEnvSlug } = useOrgParams()
  const [viewMode] = useRecoilState(actionsListViewMode)
  const [showArchived, setShowArchived] = useState(false)

  if (!props.actions.length && !props.groups?.length) return null

  return (
    <div data-pw-actions-list>
      <div className="flex justify-end mb-1">
        <ListViewToggle />
      </div>
      <div>
        {(!!props.groups?.length || !!props.actions.length) && (
          <ActionsListGroup
            {...props}
            actions={props.actions}
            groups={props.groups}
            title={null}
            viewMode={viewMode}
          />
        )}
      </div>
      {props.archivedActions.length > 0 && !props.slugPrefix && (
        <>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowArchived(prev => !prev)}
              className="text-sm font-medium inline-flex items-center"
            >
              {showArchived ? 'Hide' : 'Show'}{' '}
              {pluralizeWithCount(
                props.archivedActions.length,
                'archived action',
                'archived actions'
              )}
              <IconCaretDown
                className={classNames('ml-0.5 w-4 h-4', {
                  'rotate-180': showArchived,
                })}
              />
            </button>
          </div>
          {showArchived && (
            <div className="mt-2">
              <div className="space-y-2">
                {props.archivedActions.map((action, idx) => (
                  <ActionsListItem
                    key={idx}
                    canRun={props.mode !== 'live'}
                    canConfigure={props.canConfigure}
                    action={action}
                    actionMode={props.mode}
                    viewMode={viewMode}
                    slugPrefix={props.slugPrefix}
                    showFullSlug={props.showFullSlug}
                  />
                ))}
              </div>
              {props.mode === 'live' ? (
                <p className="mt-2.5 text-[13px]">
                  {pluralize(
                    props.archivedActions.length,
                    'This action has been archived but is still registered in code.',
                    'These actions have been archived but are still registered in code.'
                  )}
                  <br />
                  Remove archived actions from your code and redeploy to remove
                  them from the dashboard, or unarchive the actions to restore
                  them to the list above.
                </p>
              ) : (
                <p className="mt-2.5 text-[13px]">
                  {pluralize(
                    props.archivedActions.length,
                    'This action has been archived in live mode.',
                    'These actions have been archived in live mode.'
                  )}
                  <br />
                  Remove archived actions from your code to remove them from the
                  dashboard, or unarchive actions in{' '}
                  <Link
                    to={`/dashboard/${orgEnvSlug}/actions`}
                    className="text-primary-500 hover:opacity-60 font-medium"
                  >
                    live mode
                  </Link>{' '}
                  to restore them to the list above.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
