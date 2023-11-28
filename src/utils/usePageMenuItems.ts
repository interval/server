import { InternalButtonItem } from '@interval/sdk/dist/types'
import { IVButtonProps } from '~/components/IVButton'
import useRenderContext from '~/components/RenderContext'
import { getCurrentPath } from '~/utils/url'

export default function usePageMenuItems(
  menuItems: InternalButtonItem[],
  options?: {
    defaultButtonTheme?: IVButtonProps['theme']
  }
): IVButtonProps[] {
  const { defaultButtonTheme } = options ?? {}
  const { getActionUrl } = useRenderContext()

  if (!menuItems) return []

  const totalItems = menuItems.length

  return menuItems.map((menuItem, index) => {
    let href: string | undefined
    let state: IVButtonProps['state']
    let absolute = false
    const isLastItem = index === totalItems - 1

    if ('url' in menuItem) {
      href = menuItem.url
      absolute = true
    } else if ('route' in menuItem) {
      href = getActionUrl({
        base: window.location.origin,
        slug: menuItem.route,
        params: menuItem.params,
      })
      state = {
        shouldCreateNewTransaction: true,
        backPath: getCurrentPath(),
      }
    } else if ('action' in menuItem) {
      href = getActionUrl({
        base: window.location.origin,
        slug: menuItem.action,
        params: menuItem.params,
      })
      state = {
        shouldCreateNewTransaction: true,
        backPath: getCurrentPath(),
      }
    }

    let theme: IVButtonProps['theme']

    if (menuItem.theme === 'default') {
      // map 'default' to 'primary'
      theme = 'primary'
    } else if (!menuItem.theme && defaultButtonTheme) {
      theme = defaultButtonTheme
    } else {
      // Respect users' theme choice, otherwise make last button the primary button
      theme = menuItem.theme ?? (isLastItem ? 'primary' : 'secondary')
    }

    return {
      ...menuItem,
      href,
      theme,
      state,
      absolute,
      newTab: absolute ? true : undefined,
    }
  })
}
