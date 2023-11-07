import { useEffect } from 'react'
import { ActionGroup } from '@prisma/client'
import { ActionMode } from '~/utils/types'
import Layout from './Layout'
import usePage from './usePage'
import { ActionModeContext, StandaloneLoadingState } from '../TransactionUI'
import { PendingConnectionIndicator } from '../TransactionUI/_presentation/TransactionLayout'
import { useActionUrlBuilder } from '~/utils/actions'
import { RenderContextProvider } from '~/components/RenderContext'
import ErrorState from '../TransactionUI/_presentation/ErrorState'

interface PageUIProps {
  page: ActionGroup
  mode: ActionMode
  breadcrumbs?: ActionGroup[]
  fallback?: React.ReactElement
}

export default function PageUI({
  page,
  mode,
  breadcrumbs,
  fallback,
}: PageUIProps) {
  const {
    layout,
    loadingState,
    pageKey,
    pageSlug,
    onRespond,
    register,
    uiState,
  } = usePage({
    pageSlug: page.slug,
    mode,
  })

  useEffect(() => {
    return register()
  }, [register])

  const actionUrlBuilder = useActionUrlBuilder(mode)

  // const dialog = useDialogState()
  // const [inlineActionKey, setInlineActionKey] = useState<string | null>(null)
  // const { visible, animating, show } = dialog
  // const handleSetInlineActionKey = useCallback(
  //   (key: string) => {
  //     setInlineActionKey(key)
  //     show()
  //   },
  //   [show]
  // )
  // useEffect(() => {
  //   if (!visible && !animating) {
  //     setInlineActionKey(null)
  //   }
  // }, [visible, animating])

  if (layout === null) {
    return fallback ?? null
  }

  if (layout) {
    return (
      <>
        <ActionModeContext.Provider value={mode}>
          <RenderContextProvider getActionUrl={actionUrlBuilder}>
            <Layout
              key={pageKey}
              layout={layout}
              pageKey={pageKey}
              pageSlug={pageSlug}
              group={page}
              onRespond={onRespond}
              mode={mode}
              breadcrumbs={
                breadcrumbs && breadcrumbs.length >= 2 ? breadcrumbs : undefined
              }
            />
            {/*process.env.NODE_ENV === 'development' && (
              <InlineAction
              dialog={dialog}
              actionKey={inlineActionKey}
              parent={{ type: 'ActionGroup', id: group.id, hostInstanceId }}
              />
            )*/}
          </RenderContextProvider>
        </ActionModeContext.Provider>
        <ErrorState mode={mode} state={uiState} onRefresh={register} />
      </>
    )
  }

  if (loadingState) {
    return <StandaloneLoadingState {...loadingState} />
  }

  return <PendingConnectionIndicator isFetching={!layout} />
}
