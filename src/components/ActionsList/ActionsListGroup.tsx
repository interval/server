import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import classNames from 'classnames'
import { ActionsListProps } from '.'
import { ListViewToggleProps } from '../ListViewToggle'
import ActionsListItem from './ActionsListItem'
import { getActionUrl, getStatus } from '~/utils/actions'
import IconFolder from '~/icons/compiled/Folder'
import { useOrgParams } from '~/utils/organization'
import WrapOnUnderscores from '../WrapOnUnderscores'
import IVTooltip from '~/components/IVTooltip'

interface ActionsListGroupProps extends Omit<ActionsListProps, 'title'> {
  title: string | null
  className?: string
  groupSlug?: string
  viewMode: ListViewToggleProps['value']
}

export default function ActionsListGroup(props: ActionsListGroupProps) {
  const { orgEnvSlug } = useOrgParams()
  const { groupSlug, mode } = props

  const href = useMemo(() => {
    if (!groupSlug) return

    return getActionUrl({ orgEnvSlug, mode, slug: groupSlug })
  }, [groupSlug, orgEnvSlug, mode])

  return (
    <div className={props.className}>
      {props.title && (
        <h3 className="h3 pt-0.5 text-gray-900">
          {href ? <Link to={href}>{props.title}</Link> : props.title}
        </h3>
      )}
      <ul
        role="list"
        className={classNames(
          'grid gap-2',
          props.viewMode === 'grid'
            ? 'grid-cols-2 md:grid-cols-3'
            : 'grid-cols-1'
        )}
      >
        {props.groups?.map(group => {
          const url = getActionUrl({
            orgEnvSlug,
            mode,
            slug: group.slug,
          })
          const hostStatus = getStatus(group) ?? 'OFFLINE'
          return (
            <Link
              key={group.slug}
              to={url}
              data-pw-action-group={group.slug}
              className={classNames(
                'border rounded-md py-4 px-4 text-gray-900 leading-tight text-md font-medium tracking-[-0.01em] hover:shadow-sm hover:border-gray-300',
                {
                  'font-medium': props.mode === 'live',
                  'opacity-75': hostStatus !== 'ONLINE',
                  'hover:opacity-100': hostStatus !== 'OFFLINE',
                }
              )}
            >
              {(group.unlisted || hostStatus !== 'ONLINE') && (
                <div className="font-medium text-xs mb-1 flex gap-2">
                  {group.unlisted && <p>Unlisted</p>}
                  {hostStatus === 'OFFLINE' && (
                    <p className="text-red-700">Offline</p>
                  )}
                  {hostStatus === 'UNREACHABLE' && (
                    <IVTooltip text="We had trouble reaching this page recently, but you can try to run it anyway.">
                      <p className="text-amber-700 opacity-75">Unreachable</p>
                    </IVTooltip>
                  )}
                </div>
              )}
              <div className="flex items-center gap-3">
                <IconFolder className="w-5 h-5 text-blue-400" />
                <div>
                  <WrapOnUnderscores label={group.name} />
                </div>
              </div>
              {group.description && (
                <div
                  className={classNames(
                    'whitespace-pre-line text-sm mt-1.5 text-gray-500 leading-5 overflow-y-hidden font-normal',
                    {
                      'max-h-[60px]': props.viewMode === 'grid',
                      'max-h-[40px]': props.viewMode === 'list',
                    }
                  )}
                  title={group.description}
                >
                  {group.description}
                </div>
              )}
            </Link>
          )
        })}
        {props.actions.map(action => (
          <ActionsListItem
            canRun={props.canRun}
            canConfigure={props.canConfigure}
            key={action.id}
            action={action}
            actionMode={props.mode}
            viewMode={props.viewMode}
            slugPrefix={props.slugPrefix}
            showFullSlug={props.showFullSlug}
          />
        ))}
      </ul>
    </div>
  )
}
