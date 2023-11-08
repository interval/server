import { io, ctx, Action, Page, Layout } from '@interval/sdk'
import {
  blockedWsIds,
  connectedClients,
  userClientIds,
  ConnectedClient,
} from '~/wss/processVars'
import { logger } from '~/server/utils/logger'
import prisma from '~/server/prisma'

export default new Page({
  name: 'Clients',
  handler: async () => {
    let clientData = Array.from(connectedClients.values())
    let userClientData = Array.from(userClientIds.entries()).map(
      ([userId, clientIds]) => {
        let user: ConnectedClient['user'] | undefined
        const clientId = clientIds.values().next().value

        if (clientId) {
          user = connectedClients.get(clientId)?.user
        }

        return {
          userId,
          user,
          clients: clientIds.size,
        }
      }
    )

    if (ctx.params.userId && typeof ctx.params.userId === 'string') {
      clientData = clientData.filter(h => h.user.id === ctx.params.userId)
      userClientData = userClientData.filter(
        h => h.userId === ctx.params.userId
      )
    }

    return new Layout({
      children: [
        io.display.table('Connected clients', {
          data: clientData,
          columns: [
            {
              label: 'ID',
              renderCell: row => row.ws.id,
            },
            {
              label: 'Organization',
              renderCell: row => row.organization?.name,
            },
            {
              label: 'User ID',
              renderCell: row => row.user.id,
            },
            {
              label: 'User email',
              renderCell: row => row.user.email,
            },
          ],
          rowMenuItems: row => [
            {
              label: 'Drop connection',
              route: 'dump_wss_state/clients/drop_client_connection',
              params: {
                id: row.ws.id,
              },
            },
          ],
        }),
        io.display.table('Connected users', {
          data: userClientData,
          columns: [
            {
              label: 'ID',
              accessorKey: 'userId',
            },
            {
              label: 'Email',
              renderCell: row => row.user?.email,
            },
            {
              label: 'Connected clients',
              accessorKey: 'clients',
            },
          ],
          rowMenuItems: row => [
            {
              label: 'Disable and drop connections',
              route: 'dump_wss_state/clients/disable_user_drop_connections',
              params: {
                id: row.userId,
              },
            },
          ],
        }),
      ],
    })
  },
  routes: {
    drop_client_connection: new Action({
      name: 'Drop client connection',
      unlisted: true,
      handler: async () => {
        const id = ctx.params.id
        if (!id || typeof id !== 'string') {
          throw new Error('Invalid param id')
        }

        const identityConfirmed = await io.confirmIdentity(
          'Confirm you can do this'
        )
        if (!identityConfirmed) throw new Error('Unauthorized')

        const connectedClient = connectedClients.get(id)

        if (!connectedClient) throw new Error('Not found')

        const { rpc, ws, pageKeys, ...rest } = connectedClient

        await io.display.object('Connected client', {
          data: rest,
        })

        const addToBlocklist = await io.input.boolean(
          'Add client to blocklist to prevent reconnection?'
        )

        const confirmed = await io.confirm(
          'Are you sure you want to drop this connection?',
          {
            helpText: addToBlocklist
              ? 'They should not be able to reconnect, but disable user if necessary to make sure.'
              : 'They should reconnect automatically without being added to blocklist.',
          }
        )

        if (!confirmed) return 'Unconfirmed, nothing to do.'

        console.log('Manually closing host connection for ID', id)

        if (addToBlocklist) {
          blockedWsIds.add(connectedClient.ws.id)
        }

        connectedClient.ws.close(1008, 'Manually closed due to misbehavior.')
      },
    }),
    disable_user_drop_connections: new Action({
      name: 'Disable user account, drop connections',
      unlisted: true,
      handler: async () => {
        const id = ctx.params.id
        if (!id || typeof id !== 'string') {
          throw new Error('Invalid param id')
        }

        const identityConfirmed = await io.confirmIdentity(
          'Confirm you can do this'
        )
        if (!identityConfirmed) throw new Error('Unauthorized')

        const user = await prisma.user.findUniqueOrThrow({
          where: {
            id,
          },
        })

        const clientIds = userClientIds.get(id) ?? new Set()

        await io.display.object('User', {
          data: user,
        })

        await io.display.metadata('', {
          data: [{ label: 'Client connections', value: clientIds.size }],
        })

        const confirmed = await io.confirm(
          'Are you sure you want to disable this user and drop all of its connections?'
        )

        if (!confirmed) return 'Unconfirmed, nothing to do.'

        await ctx.loading.start({
          label: 'Disabling user',
        })

        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            deletedAt: new Date(),
          },
        })

        await prisma.userSession.deleteMany({
          where: {
            userId: user.id,
          },
        })

        if (clientIds.size) {
          await ctx.loading.start({
            label: 'Dropping connections',
            itemsInQueue: clientIds.size,
          })

          for (const clientId of clientIds) {
            const client = connectedClients.get(clientId)
            if (client) {
              logger.info('Manually closing client connection', { clientId })
              client.ws.close(1008, 'Manually closed due to misbehavior.')
            } else {
              await ctx.log(`No connected host found for ID ${clientId}`)
            }

            await ctx.loading.completeOne()
          }
        }
      },
    }),
  },
})
