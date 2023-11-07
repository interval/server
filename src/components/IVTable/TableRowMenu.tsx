import DropdownMenu, { DropdownMenuItemProps } from '../DropdownMenu'
import MoreIcon from '~/icons/compiled/More'

export default function TableRowMenu({
  menu,
}: {
  menu: DropdownMenuItemProps[] | null | undefined
}) {
  if (!menu || !menu.length) {
    return null
  }

  return (
    <div className="relative top-px">
      <DropdownMenu
        buttonClassName="focus:outline-none px-1 py-1 border border-transparent hover:border-gray-300 rounded-md"
        menuClassName="min-w-[120px] max-w-[240px]"
        placement="bottom-end"
        title="Open options"
        options={menu.map(act => {
          if ('url' in act) {
            return { ...act, newTab: act.url !== '#' }
          }

          // action/route/params props have already been normalized into `path` by useTableSerializer()
          return act
        })}
        // `modal` mode prevents menu from interfering with table overflow behavior
        modal
      >
        <MoreIcon className="w-4 h-4 text-gray-500" />
      </DropdownMenu>
    </div>
  )
}
