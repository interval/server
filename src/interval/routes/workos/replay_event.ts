import { Action, io } from '@interval/sdk'
import { Webhook } from '@workos-inc/node'
import { handleWebhook } from '~/server/api/workosWebhooks'

import { workos } from '~/server/auth'

export default new Action({
  name: 'Replay event',
  handler: async () => {
    if (!workos) {
      throw new Error(
        'WorkOS credentials not found, WorkOS integration not enabled.'
      )
    }

    const confirmed = await io.confirmIdentity('Who are you')
    if (!confirmed) throw new Error('Unauthorized')

    const eventId = await io.input.text('Event ID you want to replay')

    const prevId = await io.input.text(
      'ID for the previous event in the queue, for validation'
    )

    const events = await workos.events.listEvents({
      limit: 1,
      after: prevId,
    })

    const event = events.data[0]

    await io.display.object('Event', {
      data: event,
    })

    if (event.id !== eventId) throw new Error('IDs do not match')

    await handleWebhook(event as unknown as Webhook)
  },
})
