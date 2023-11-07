import type { SerializableRecord } from '@interval/sdk/dist/ioSchema'
import type {
  Action,
  ActionGroup,
  ActionAccess,
  ActionMetadata,
  ActionSchedule,
  QueuedAction,
  Transaction,
  Organization,
  OrganizationPrivate,
  NotificationDelivery,
  Notification,
  HostInstanceStatus,
  Prisma,
  ActionGroupMetadata,
  ActionGroupAccess,
} from '@prisma/client'

export type ActionMode = 'console' | 'live'

export type ComponentContext = 'docs' | 'transaction' | 'page'

export type IOLinkProps =
  | { url: string }
  // deprecated in favor of `url`
  | { href: string }
  | { route: string; params?: SerializableRecord }
  // deprecated in favor of `action`
  | { action: string; params?: SerializableRecord }

export interface MetadataWithAccesses extends ActionMetadata {
  accesses?: ActionAccess[]
}

export interface ActionGroupMetadataWithAccesses extends ActionGroupMetadata {
  accesses?: ActionGroupAccess[]
}

export interface ActionGroupWithPossibleMetadata extends ActionGroup {
  actions: ActionWithPossibleMetadata[]
}

export interface ActionWithMetadata extends Action {
  metadata: MetadataWithAccesses
}

export interface NamedActionLike {
  slug: string
  name?: string | null
  metadata?: MetadataWithAccesses | ActionGroupMetadata | null
}

export interface ActionWithPossibleMetadata extends Action {
  metadata?: MetadataWithAccesses | null
}

export interface ActionSearchResult {
  id: string
  slug: string
  name: string | null
  status: HostInstanceStatus | undefined
  description: string | null
  isArchived: boolean
  unlisted: boolean
  canView: boolean | undefined
  canRun: boolean | undefined
  canConfigure: boolean | undefined
  parentSlug?: string
}

// Standard shape of an Action returned from the API
// Includes online hosts, active schedules, metadata, and run/view permissions.
export type ActionLookupResult = Prisma.ActionGetPayload<{
  include: {
    hostInstances: { select: { status: true } }
    httpHosts: { select: { status: true } }
    metadata: { include: { accesses: true } }
    schedules: { where: { deletedAt: null } }
  }
}> & {
  status: HostInstanceStatus | undefined
  canRun: boolean
  canView: boolean
  canConfigure: boolean
  parentSlug?: string
}

// Standard shape of an ActionGroup returned from the API.
// Includes online hosts, metadata, actions, and run/view permissions.
export type ActionGroupLookupResult = Prisma.ActionGroupGetPayload<{
  include: {
    hostInstances: { select: { status: true; isInitializing: true } }
    httpHosts: { select: { status: true } }
    metadata: { include: { accesses: true } }
  }
}> & {
  status: HostInstanceStatus | undefined
  canRun: boolean
  canView: boolean
  actions: ActionLookupResult[]
  groups: ActionGroupLookupResult[]
  parentSlug?: string
}

export interface TransactionWithAction extends Transaction {
  action: Action
}

export interface TransactionWithMetadata extends Transaction {
  action: ActionWithMetadata
}

export interface TransactionWithPossibleMetadata extends Transaction {
  action: ActionWithPossibleMetadata
}

export interface QueuedActionWithPossibleMetadata extends QueuedAction {
  action: ActionWithPossibleMetadata
  transaction?: Transaction | null
}

export interface OrganizationWithPrivate extends Organization {
  private: OrganizationPrivate | null
}

export interface NotificationWithDeliveries extends Notification {
  notificationDeliveries: NotificationDelivery[]
}

export interface ActionScheduleWithAction extends ActionSchedule {
  action: ActionWithPossibleMetadata
}
