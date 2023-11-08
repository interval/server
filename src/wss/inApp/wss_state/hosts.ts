import { io, ctx, Action, Page, Layout } from '@interval/sdk'
import { blockedWsIds, connectedHosts, apiKeyHostIds } from '~/wss/processVars'
import prisma from '~/server/prisma'
import { logger } from '~/server/utils/logger'

export default new Page({
  name: 'Hosts',
  handler: async () => {
    let hostData = Array.from(connectedHosts.values())
    let apiKeyHostData = Array.from(apiKeyHostIds.entries()).map(
      ([apiKeyId, hostIds]) => ({ apiKeyId, hosts: hostIds.size })
    )

    if (ctx.params.apiKeyId && typeof ctx.params.apiKeyId === 'string') {
      hostData = hostData.filter(h => h.apiKeyId === ctx.params.apiKeyId)
      apiKeyHostData = apiKeyHostData.filter(
        h => h.apiKeyId === ctx.params.apiKeyId
      )
    }

    return new Layout({
      children: [
        io.display.table('Connected hosts', {
          data: hostData,
          columns: [
            {
              label: 'ID',
              renderCell: row => row.ws.id,
            },
            {
              label: 'Organization',
              renderCell: row => row.organization?.name,
            },
            'usageEnvironment',
            {
              label: 'API Key',
              accessorKey: 'apiKeyId',
            },
          ],
          rowMenuItems: row => [
            {
              label: 'Drop connection',
              route: 'dump_wss_state/hosts/drop_host_connection',
              params: {
                id: row.ws.id,
              },
            },
          ],
        }),
        io.display.table('Hosts by API Key', {
          data: apiKeyHostData,
          rowMenuItems: row => [
            {
              label: 'Disable and disconnect',
              route: 'dump_wss_state/hosts/disable_api_key_and_disconnect',
              params: {
                id: row.apiKeyId,
              },
            },
          ],
        }),
      ],
    })
  },
  routes: {
    drop_host_connection: new Action({
      name: 'Drop host connection',
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

        const connectedHost = connectedHosts.get(id)

        if (!connectedHost) throw new Error('Not found')

        const { rpc, ws, pageKeys, ...rest } = connectedHost

        await io.display.object('Connected host', {
          data: rest,
        })

        const addToBlocklist = await io.input.boolean(
          'Add host to blocklist to prevent reconnection?'
        )

        const confirmed = await io.confirm(
          'Are you sure you want to drop this connection?',
          {
            helpText: addToBlocklist
              ? 'They should not be able to reconnect, but disable API key if necessary to make sure.'
              : 'They should reconnect automatically without being added to blocklist.',
          }
        )

        if (!confirmed) return 'Unconfirmed, nothing to do.'

        console.log('Manually closing host connection for ID', id)

        if (addToBlocklist) {
          blockedWsIds.add(connectedHost.ws.id)
        }

        connectedHost.ws.close(1008, 'Manually closed due to misbehavior.')
      },
    }),
    disable_api_key_drop_connections: new Action({
      name: 'Disable API key, drop connections',
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

        const apiKey = await prisma.apiKey.findUniqueOrThrow({
          where: {
            id,
          },
        })

        const hostIds = apiKeyHostIds.get(id) ?? new Set()

        await io.display.object('API Key', {
          data: apiKey,
        })

        await io.display.metadata('', {
          data: [{ label: 'Host connections', value: hostIds.size }],
        })

        const confirmed = await io.confirm(
          'Are you sure you want to disable this API key and drop all of its connections?'
        )

        if (!confirmed) return 'Unconfirmed, nothing to do.'

        await ctx.loading.start({
          label: 'Disabling key',
        })

        await prisma.apiKey.update({
          where: {
            id: apiKey.id,
          },
          data: {
            deletedAt: new Date(),
          },
        })

        if (hostIds.size) {
          await ctx.loading.start({
            label: 'Dropping connections',
            itemsInQueue: hostIds.size,
          })

          for (const hostId of hostIds) {
            const host = connectedHosts.get(hostId)
            if (host) {
              logger.info('Manually closing host connection', { hostId })
              host.ws.close(1008, 'Manually closed due to misbehavior.')
            } else {
              await ctx.log(`No connected host found for ID ${hostId}`)
            }

            await ctx.loading.completeOne()
          }
        }
      },
    }),
  },
})
