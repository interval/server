import classNames from 'classnames'
import { atom, useRecoilState } from 'recoil'
import { localStorageRecoilEffect } from '~/utils/localStorage'
import DropdownMenu from '~/components/DropdownMenu'
import IconCheck from '~/icons/compiled/Check'
import IconCaretDown from '~/icons/compiled/CaretDown'

// We used to have different view modes per environment.
// This merges them while keeping users' prior preference.
function mergedListViewMode() {
  const mode = localStorageRecoilEffect('actionsListViewMode')
  const liveMode = localStorageRecoilEffect('publishedActionsViewMode')
  const devMode = localStorageRecoilEffect('consoleActionsViewMode')
  return mode || devMode || liveMode
}

export const actionsListViewMode = atom<'list' | 'grid'>({
  key: 'actionsListViewMode',
  default: 'list',
  effects: [mergedListViewMode()],
})

export interface ListViewToggleProps {
  value: 'list' | 'grid'
  onChange: (value: 'list' | 'grid') => void
}

export default function ListViewToggle() {
  const [viewMode, setViewMode] = useRecoilState(actionsListViewMode)

  return (
    <DropdownMenu
      buttonClassName="focus:outline-none py-1 flex items-center justify-center rounded-md"
      menuClassName="min-w-[120px] max-w-[240px] -mr-1 -mt-1"
      placement="bottom-end"
      title="Open options"
      options={[
        {
          label: (
            <span className="inline-flex space-x-1.5 items-center">
              <IconCheck
                className={classNames('w-3 h-3 -ml-1', {
                  'opacity-0': viewMode === 'grid',
                })}
                strokeWidth={3}
              />
              <span>View as list</span>
            </span>
          ),
          onClick: () => {
            setViewMode('list')
          },
        },
        {
          label: (
            <span className="inline-flex space-x-1.5 items-center">
              <IconCheck
                className={classNames('w-3 h-3 -ml-1', {
                  'opacity-0': viewMode === 'list',
                })}
                strokeWidth={3}
              />
              <span>View as grid</span>
            </span>
          ),
          onClick: () => {
            setViewMode('grid')
          },
        },
      ]}
      // `modal` mode prevents menu from interfering with table overflow behavior
      modal
    >
      <span className="inline-flex items-center text-xs hover:text-gray-900">
        <span>
          <strong>View as:</strong> {viewMode === 'list' ? 'List' : 'Grid'}
        </span>
        <IconCaretDown className="opacity-50 ml-px w-4 h-4" />
      </span>
    </DropdownMenu>
  )
}
