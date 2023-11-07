import { PendingIOCall } from '~/utils/transactions'
import { LayoutSchema } from '@interval/sdk/dist/classes/Layout'
import { ActionMode } from '~/utils/types'
import BasicLayout from './Basic'
import { ActionGroup } from '@prisma/client'
import { BackwardCompatibleLoadingState } from '@interval/sdk/dist/internalRpcSchema'

export interface LayoutProps {
  pageKey: string
  pageSlug?: string
  onRespond: PendingIOCall['onRespond']
  layout: LayoutSchema
  group: ActionGroup
  mode: ActionMode
  loadingState?: BackwardCompatibleLoadingState
  breadcrumbs?: ActionGroup[]
  // setInlineActionKey: (key: string) => void
}

export default function Layout(props: LayoutProps) {
  return <BasicLayout {...props} />
}
