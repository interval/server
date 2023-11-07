import IVButton from '~/components/IVButton'
import useRenderContext from '~/components/RenderContext'
import useIsomorphicLocation from '~/utils/useIsomorphicLocation'
import { RCTResponderProps } from '~/components/RenderIOCall'
import { getCurrentPath } from '~/utils/url'

export function useActionUrl(props: {
  url?: string
  href?: string
  route?: string
  action?: string
}): string {
  const { getActionUrl } = useRenderContext()
  const location = useIsomorphicLocation()()

  // don't link to actions in docs examples
  if (location.pathname.startsWith('/component-preview')) {
    return ''
  }

  if (props.url) return props.url
  if (props.href) return props.href

  const slug = props.route ?? props.action ?? ''

  return getActionUrl({
    slug,
    ...props,
  })
}

export function getRouteOrAction(props: RCTResponderProps<'DISPLAY_LINK'>) {
  const route =
    'route' in props ? props.route : 'action' in props ? props.action : null

  if (route) {
    return {
      route,
      params: 'params' in props ? props.params : undefined,
    }
  }

  return props
}

export default function DisplayLink(props: RCTResponderProps<'DISPLAY_LINK'>) {
  const actionUrl = useActionUrl(getRouteOrAction(props))

  const url = 'url' in props ? props.url : 'href' in props ? props.href : null

  const newTab = 'url' in props || 'href' in props

  return (
    <div className="space-y-2">
      <IVButton
        href={props.context === 'docs' ? undefined : actionUrl || url || '#'}
        newTab={newTab}
        label={props.label}
        onClick={
          props.context === 'docs'
            ? () => {
                /* */
              }
            : undefined
        }
        theme={props.theme === 'default' ? 'secondary' : props.theme}
        absolute={newTab}
        state={{
          // Disables the confirmation dialog when exiting transactions
          shouldShowPrompt: false,
          // Create a new transaction if linking to current action
          shouldCreateNewTransaction: true,
          // used for back button navigation
          backPath: getCurrentPath(),
        }}
      />
    </div>
  )
}
