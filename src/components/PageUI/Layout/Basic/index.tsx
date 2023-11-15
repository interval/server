import { useMemo } from 'react'
import { SuperJSONResult } from 'superjson/dist/types'
import {
  BasicLayoutSchema,
  LayoutError,
  MetaItemSchema,
} from '@interval/sdk/dist/classes/Layout'
import superjson from '~/utils/superjson'
import { unpackIOCall } from '~/utils/transactions'
import PageHeading from '~/components/PageHeading'
import { RenderIOCall } from '~/components/RenderIOCall'
import { LayoutProps } from '..'
import MetadataCardList from '~/components/MetadataCardList'
import useDashboardStructure from '~/utils/useDashboardStructure'
import MobilePageSubnav from '../MobileSubnav'
import { UnimplementedComponents } from '~/components/TransactionUI'
import usePageMenuItems from '~/utils/usePageMenuItems'
import { useIsFeatureEnabled } from '~/utils/useIsFeatureEnabled'
import { logger } from '~/utils/logger'

interface BasicLayoutProps extends LayoutProps {
  layout: BasicLayoutSchema
}

function PageErrorItem({ error }: { error: LayoutError }) {
  return (
    <li className="ml-4">
      <span>
        <b>{error.error}:</b>
      </span>{' '}
      {error.message}
    </li>
  )
}

export default function BasicLayout({
  pageSlug,
  pageKey,
  layout,
  onRespond,
  mode,
  group,
}: BasicLayoutProps) {
  const { children } = layout
  const ioCall = useMemo(
    () => (children ? unpackIOCall(children) : undefined),
    [children]
  )

  const pageMenuItems = usePageMenuItems(layout.menuItems ?? [])

  const { hasSubnav, actionSlug, secondaryNav } = useDashboardStructure({
    mode,
    actionSlug: group.slug,
  })

  const shouldDisableTableTruncation = useIsFeatureEnabled(
    'TABLE_TRUNCATION_DISABLED'
  )

  let pageMeta: MetaItemSchema[] | null = null
  if (layout.metadata) {
    try {
      pageMeta = superjson.deserialize(layout.metadata as SuperJSONResult)
    } catch (error) {
      logger.error('Error from SuperJSON deserialization', {
        error,
        meta: layout.metadata.meta,
      })
    }
  }

  // don't render a page that doesn't match the current URL.
  // prevents flickering when switching between pages
  if (actionSlug !== pageSlug) {
    return null
  }

  const titleError = layout.errors?.find(e => e.layoutKey === 'title')
  const descriptionError = layout.errors?.find(
    e => e.layoutKey === 'description'
  )
  const overallErrors = layout.errors?.filter(e => !e.layoutKey)

  return (
    <div className="dashboard-container">
      <PageHeading
        title={layout.title}
        titleError={
          titleError && (
            <span className="text-red-800">
              <b>{titleError.error}</b>: {titleError.message}
            </span>
          )
        }
        description={
          layout.description !== null ? layout.description : undefined
        }
        descriptionError={
          descriptionError && (
            <span className="text-red-800">
              <b>{descriptionError.error}</b>: {descriptionError.message}
            </span>
          )
        }
        actions={pageMenuItems}
      />
      {hasSubnav && (
        <div className="mb-4 lg:hidden">
          <MobilePageSubnav
            title={group.name}
            secondaryNav={secondaryNav}
            mode={mode}
          />
        </div>
      )}
      {overallErrors && overallErrors.length > 0 && (
        <div className="bg-red-50 rounded-md p-4 text-red-800 text-sm mb-4">
          <p className="mb-2 text-red-800">Errors loading page:</p>
          <ul className="list-disc list-inside">
            {overallErrors.map((error, i) => (
              <PageErrorItem error={error} key={i} />
            ))}
          </ul>
          <p className="mt-4 text-red-800">
            Please check your host logs for more information.
          </p>
        </div>
      )}
      {pageMeta && (
        <div className="mb-6">
          <MetadataCardList items={pageMeta} />
        </div>
      )}
      {ioCall && (
        <RenderIOCall
          key={ioCall.inputGroupKey}
          state="IN_PROGRESS"
          id={pageKey}
          inputGroupKey={ioCall.inputGroupKey}
          onRespond={onRespond}
          elements={ioCall.elements}
          indexOfFirstInteractiveElement={null}
          context="page"
          renderNextButton={false}
          components={UnimplementedComponents}
          shouldDisableTableTruncation={shouldDisableTableTruncation}
        />
      )}
    </div>
  )
}
