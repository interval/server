import React from 'react'
import {
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarResults,
  KBarSearch,
  useMatches,
  useKBar,
  ActionImpl,
  ActionId,
} from 'kbar'
import classNames from 'classnames'
import MultilineKBarSearch from './MultilineKBarSearch'
import useCommandBarActions, {
  COMMAND_BAR_INPUT_ID,
  VIEW_ONLY_MESSAGE,
} from './useCommandBarActions'
import IconExternalLink from '~/icons/compiled/ExternalLink'

export function DynamicCommandBarActions() {
  useCommandBarActions()

  return null
}

function usePlatformControlIcon() {
  const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0
  return isMac ? '⌘' : 'Ctrl'
}

function Shortcut({
  children,
  withCmdCtrl,
}: {
  children: React.ReactNode
  withCmdCtrl?: boolean
}) {
  const prefix = usePlatformControlIcon()

  return (
    <kbd className="text-[13px] text-gray-600 ml-1 px-2 py-0.5 rounded border border-gray-200 bg-white">
      {withCmdCtrl && prefix} {children}
    </kbd>
  )
}

export default function CommandBar() {
  const { currentRootActionId } = useKBar(state => ({
    currentRootActionId: state.currentRootActionId,
  }))

  return (
    <KBarPortal>
      <KBarPositioner className="z-50">
        <KBarAnimator className="w-full max-w-xl shadow-command-bar border border-gray-300 bg-white rounded-lg overflow-hidden">
          <div className="relative">
            <KBarSearch
              id={COMMAND_BAR_INPUT_ID}
              data-pw-command-bar-input
              defaultPlaceholder="Search for actions or navigate"
              className="w-full outline-none border-b-1 py-4 pl-5 pr-[80px] text-sm rounded-t-lg"
            />
            {currentRootActionId === null && (
              <div className="absolute top-0 right-0 h-[52px] px-4 flex items-center">
                <Shortcut withCmdCtrl>K</Shortcut>
              </div>
            )}
            {currentRootActionId === 'search-actions' && (
              <div className="absolute top-0 right-0 h-[52px] px-4 flex items-center">
                <Shortcut>/</Shortcut>
              </div>
            )}
          </div>
          <RenderResults />
        </KBarAnimator>
      </KBarPositioner>
    </KBarPortal>
  )
}

function RenderResults() {
  let { results, rootActionId } = useMatches()

  if (!results.length) {
    return (
      <div data-pw-command-bar-results>
        <p className="px-5 pt-3 pb-4 text-sm text-gray-500 opacity-50">
          No results
        </p>
      </div>
    )
  }

  return (
    // kbar gives the fixed container a static height that's 2px too short, unsure why
    <div className="pb-[2px]" data-pw-command-bar-results>
      <KBarResults
        items={results}
        maxHeight={500}
        onRender={({ item, active }) =>
          typeof item === 'string' ? (
            <div className="px-5 py-2 pt-4 text-xs text-gray-500 opacity-50 uppercase tracking-wider font-medium">
              {item}
            </div>
          ) : (
            <ResultItem
              key={item.id}
              action={item}
              active={active}
              currentRootActionId={rootActionId || ''}
            />
          )
        }
      />
    </div>
  )
}

const ResultItem = React.forwardRef(
  (
    {
      action,
      active,
      currentRootActionId,
    }: {
      action: ActionImpl
      active: boolean
      currentRootActionId: ActionId
    },
    ref: React.Ref<HTMLDivElement>
  ) => {
    const ancestors = React.useMemo(() => {
      if (!currentRootActionId) return action.ancestors
      const index = action.ancestors.findIndex(
        ancestor => ancestor.id === currentRootActionId
      )
      // +1 removes the currentRootAction; e.g.
      // if we are on the "Set theme" parent action,
      // the UI should not display "Set theme… > Dark"
      // but rather just "Dark"
      return action.ancestors.slice(index + 1)
    }, [action.ancestors, currentRootActionId])

    return (
      <div
        ref={ref}
        className={classNames(
          'flex justify-between py-2.5 px-5 cursor-pointer',
          {
            'bg-blue-50': active,
          }
        )}
      >
        <div className="flex items-center text-sm text-gray-800">
          {action.icon && action.icon}
          <div className="flex flex-col">
            <div>
              {ancestors.length > 0 &&
                ancestors.map(ancestor => (
                  <React.Fragment key={ancestor.id}>
                    <span className="opacity-50 mr-2">{ancestor.name}</span>
                    <span className="mr-2">&rsaquo;</span>
                  </React.Fragment>
                ))}
              <span
                className={
                  action.subtitle === VIEW_ONLY_MESSAGE ? 'text-gray-400' : ''
                }
              >
                {action.name}
              </span>
              {action.id === 'docs' && (
                <IconExternalLink className="w-4 h-4 text-gray-400 ml-1 inline-block relative -top-0.5" />
              )}
            </div>
            {action.subtitle && (
              <span className="text-gray-400 text-xs block mt-0.5">
                {action.subtitle}
              </span>
            )}
          </div>
        </div>
        {action.shortcut?.length ? (
          <div aria-hidden className="flex items-center -my-1 -mr-1">
            {action.shortcut.map(sc => (
              <Shortcut key={sc}>{sc}</Shortcut>
            ))}
          </div>
        ) : null}
      </div>
    )
  }
)
ResultItem.displayName = 'ResultItem'
