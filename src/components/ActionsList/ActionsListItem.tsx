import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import classNames from 'classnames'
import IconSchedule from '~/icons/compiled/Schedule'
import IconSettings from '~/icons/compiled/Settings'
import {
  getActionUrl,
  getDescription,
  getName,
  getStatus,
} from '~/utils/actions'
import { actionScheduleToDescriptiveString } from '~/utils/actionSchedule'
import IVTooltip from '~/components/IVTooltip'
import { ListViewToggleProps } from '../ListViewToggle'
import { ActionsListProps } from '.'
import WrapOnUnderscores from '../WrapOnUnderscores'
import { useOrgParams } from '~/utils/organization'

interface ActionsListItemProps {
  action: ActionsListProps['actions'][0]
  canRun?: boolean
  canConfigure?: boolean
  showFullSlug?: boolean
  viewMode: ListViewToggleProps['value']
  actionMode: ActionsListProps['mode']
  slugPrefix?: string
}

export default function ActionsListItem({
  canRun,
  action,
  actionMode,
  canConfigure,
  showFullSlug,
  viewMode,
  slugPrefix,
}: ActionsListItemProps) {
  const { orgEnvSlug } = useOrgParams()

  const hostStatus = getStatus(action) ?? 'OFFLINE'
  const actionOffline = hostStatus === 'OFFLINE'
  const canRunAction = canRun && action.canRun

  const name = useMemo(() => {
    let name = getName(action)

    if (
      slugPrefix &&
      name === action.slug &&
      name.startsWith(`${slugPrefix}/`)
    ) {
      name = name.substring(slugPrefix.length + 1)
    }

    return name
  }, [action, slugPrefix])

  const description = getDescription(action)

  const href = useMemo(
    () =>
      getActionUrl({
        base: window.location.href,
        orgEnvSlug,
        mode: actionMode,
        slug: action.slug,
      }),
    [orgEnvSlug, action.slug, actionMode]
  )

  return (
    <div
      key={action.id}
      className={classNames(
        'flex items-stretch col-span-1 border rounded-md relative group',
        {
          'hover:shadow-sm hover:border-gray-300':
            !actionOffline && canRunAction,
          'select-none': actionOffline || !canRunAction,
          'opacity-75': hostStatus !== 'ONLINE',
          'hover:opacity-100': hostStatus !== 'OFFLINE',
        }
      )}
    >
      {canConfigure && (
        <Link
          to={`/dashboard/${orgEnvSlug}/configure/${action.slug}`}
          className={classNames(
            'block absolute text-gray-400 hover:text-primary-500 right-0 top-0 p-4 z-10'
          )}
          tabIndex={-1}
        >
          <IconSettings
            className="transition-opacity supports-hover:opacity-0 supports-hover:group-hover:opacity-100 w-4 h-4 m-px"
            aria-hidden="true"
          />
        </Link>
      )}
      <Link
        to={href}
        data-pw-run-slug={action.slug}
        data-pw="run-action"
        aria-disabled={actionOffline || !canRunAction}
        onClick={event => {
          if (actionOffline || !canRunAction) {
            event.preventDefault()
          }
        }}
        className={classNames('block w-full', {
          'cursor-default': actionOffline || !canRunAction,
        })}
      >
        <div
          className={classNames(
            'w-full flex-1 flex justify-between py-4 space-x-6 pr-11',
            { 'opacity-75': actionOffline || !canRunAction }
          )}
        >
          <div
            className={classNames(
              'flex flex-col px-4 max-w-full',
              viewMode === 'grid' ? '' : ''
            )}
          >
            {(action.unlisted || hostStatus !== 'ONLINE') && (
              <div className="font-medium text-xs mb-1 flex gap-2">
                {action.unlisted && <p>Unlisted</p>}
                {hostStatus === 'OFFLINE' && (
                  <p className="text-red-700">Offline</p>
                )}
                {hostStatus === 'UNREACHABLE' && (
                  <IVTooltip text="We had trouble reaching this action recently, but you can try to run it anyway.">
                    <p className="text-amber-700 opacity-75">Unreachable</p>
                  </IVTooltip>
                )}
              </div>
            )}
            <h4
              className={classNames(
                'text-gray-900 text-md leading-tight tracking-[-0.01em] font-medium max-w-full',
                {
                  'font-medium': actionMode === 'live',
                }
              )}
            >
              <div className="break-words max-w-full">
                {showFullSlug && (
                  <div className="text-xs text-gray-500">
                    <WrapOnUnderscores label={action.slug} />
                  </div>
                )}
                <div className="break-words max-w-full">
                  <WrapOnUnderscores label={name} />
                  {action.schedules.length > 0 && (
                    <Link
                      to={`/dashboard/${orgEnvSlug}/configure/${action.slug}?tab=schedule`}
                      className="group align-middle inline-block relative -top-0.5"
                    >
                      <IVTooltip
                        text={
                          <span className="whitespace-nowrap">
                            {`Runs ${actionScheduleToDescriptiveString(
                              action.schedules[0]
                            )}`}
                          </span>
                        }
                      >
                        <IconSchedule className="w-4 h-4 text-gray-400 ml-1.5 group-hover:opacity-70" />
                      </IVTooltip>
                    </Link>
                  )}
                </div>
              </div>
            </h4>
            {description && (
              <div
                className={classNames(
                  'whitespace-pre-line text-sm mt-1.5 text-gray-500 leading-5 overflow-y-hidden',
                  {
                    'max-h-[60px]': viewMode === 'grid',
                    'max-h-[40px]': viewMode === 'list',
                  }
                )}
                title={description}
              >
                {description}
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
}
