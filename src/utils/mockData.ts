import {
  Action,
  ActionAccess,
  ActionGroup,
  ActionGroupAccess,
  ActionGroupMetadata,
  ActionMetadata,
  Organization,
  OrganizationEnvironment,
  QueuedAction,
  Transaction,
  User,
  UserAccessGroup,
  UserOrganizationAccess,
} from '@prisma/client'

export const mockUser: Omit<User, 'password' | 'idpId'> = {
  id: '1',
  firstName: 'John',
  isGhostMode: false,
  lastName: 'Doe',
  email: 'john.doe@interval.com',
  mfaId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  defaultNotificationMethod: 'EMAIL',
  timeZoneName: null,
}

export const mockOrganization: Organization = {
  id: '1',
  name: 'Interval',
  isGhostMode: false,
  slug: 'interval',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ownerId: mockUser.id,
  promoCode: null,
  requireMfa: false,
}

export const mockEnvironment: OrganizationEnvironment = {
  id: '1',
  name: 'Production',
  slug: 'production',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  organizationId: '1',
  color: null,
}

export const mockUserOrganizationAccess: UserOrganizationAccess = {
  id: '1',
  organizationId: mockOrganization.id,
  userId: mockUser.id,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSwitchedToAt: new Date(),
  permissions: ['ADMIN'],
  slackOauthNonce: null,
  onboardingExampleSlug: null,
}

export const mockTransaction: Transaction = {
  id: '1',
  ownerId: mockUser.id,
  actionId: '1',
  actionScheduleId: null,
  status: 'COMPLETED',
  createdAt: new Date(),
  updatedAt: new Date(),
  completedAt: null,
  resultData: null,
  resultDataMeta: null,
  resultSchemaVersion: null,
  resultStatus: null,
  currentClientId: null,
  lastInputGroupKey: null,
  hostInstanceId: '1',
}

export const mockAction: Action = {
  id: '1',
  slug: 'update_user',
  organizationId: mockOrganization.id,
  organizationEnvironmentId: mockEnvironment.id,
  createdAt: new Date(),
  updatedAt: new Date(),
  developerId: null,
  isInline: false,
  name: null,
  description: null,
  backgroundable: null,
  warnOnClose: true,
  unlisted: false,
}

export const mockActionGroup: ActionGroup = {
  id: '1',
  slug: 'group',
  name: 'Group',
  description: null,
  hasHandler: false,
  unlisted: false,
  organizationId: mockOrganization.id,
  organizationEnvironmentId: mockEnvironment.id,
  createdAt: new Date(),
  updatedAt: new Date(),
  developerId: null,
}

export const mockQueuedAction: QueuedAction = {
  id: '1',
  actionId: '1',
  transactionId: '1',
  assigneeId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  params: { foo: 'bar' },
  paramsMeta: null,
}

export const mockActionMetadata: ActionMetadata = {
  id: '1',
  actionId: '1',
  name: 'Update user',
  description: null,
  backgroundable: null,
  availability: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  archivedAt: null,
  defaultNotificationDelivery: null,
}

export const mockActionGroupMetadata: ActionGroupMetadata = {
  id: '1',
  actionGroupId: '1',
  availability: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockUserAccessGroup: UserAccessGroup = {
  id: '1',
  name: 'Support',
  slug: 'support',
  scimGroupId: null,
  organizationId: mockOrganization.id,
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockActionAccess: ActionAccess = {
  id: '1',
  actionMetadataId: '1',
  userAccessGroupId: '1',
  createdAt: new Date(),
  updatedAt: new Date(),
  level: 'RUNNER',
}

export const mockActionGroupAccess: ActionGroupAccess = {
  id: '1',
  actionGroupMetadataId: '1',
  userAccessGroupId: '1',
  createdAt: new Date(),
  updatedAt: new Date(),
  level: 'RUNNER',
}
