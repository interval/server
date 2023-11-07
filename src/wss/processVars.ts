import type ISocket from '@interval/sdk/dist/classes/ISocket'
import type { DuplexRPCClient } from '@interval/sdk/dist/classes/DuplexRPCClient'
import type {
  ClientSchema,
  HostSchema,
  WSServerSchema,
  LoadingState,
} from '@interval/sdk/dist/internalRpcSchema'
import type { LinkProps } from '@interval/sdk/dist/ioSchema'
import type {
  Organization,
  UsageEnvironment,
  OrganizationEnvironment,
} from '@prisma/client'

import type { SessionUserData } from '~/server/auth'

// defines functions available to clients
export interface ConnectedSocket {
  ws: ISocket
  user: SessionUserData
  organization: Organization
  organizationEnvironment: OrganizationEnvironment | null | undefined
}

export interface ConnectedHost extends ConnectedSocket {
  apiKeyId: string
  usageEnvironment: UsageEnvironment
  rpc: ServerRPCClient
  pageKeys: Set<string>
  sdkName: string | undefined
  sdkVersion: string | undefined
}

export interface ConnectedClient extends ConnectedSocket {
  rpc: ServerRPCClient
  pageKeys: Set<string>
}

export type ServerRPCClient = DuplexRPCClient<
  HostSchema & ClientSchema,
  WSServerSchema
>

export const blockedWsIds = new Set<string>()

export const connectedHosts = new Map<string, ConnectedHost>()
export const apiKeyHostIds = new Map<string, Set<string>>()

export const connectedClients = new Map<string, ConnectedClient>()
export const userClientIds = new Map<string, Set<string>>()
export const pageSockets = new Map<
  string,
  { hostId: string; clientId: string }
>()

export const pendingIOCalls = new Map<string, string>()
export const transactionLoadingStates = new Map<string, LoadingState>()
export const transactionRedirects = new Map<string, LinkProps>()

export function cloneSocket(
  socket: ConnectedSocket & { usageEnvironment?: UsageEnvironment }
) {
  return {
    id: socket.ws.id,
    user: socket.user,
    organization: socket.organization,
    usageEnvironment: socket.usageEnvironment,
  }
}

export function getReadonlyWssState() {
  const ioCalls: Record<string, string> = {}
  const loadingStates: Record<string, LoadingState> = {}

  for (const [id, ioCall] of pendingIOCalls.entries()) {
    ioCalls[id] = ioCall
  }
  for (const [id, loadingState] of transactionLoadingStates.entries()) {
    loadingStates[id] = loadingState
  }

  return {
    connectedHosts: Array.from(connectedHosts.values()).map(cloneSocket),
    connectedClients: Array.from(connectedClients.values()).map(cloneSocket),
    pendingIOCalls: ioCalls,
    transactionLoadingStates: loadingStates,
  }
}
