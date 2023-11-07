import { io, Page, Layout } from '@interval/sdk-latest'
import dedent from 'ts-dedent'
import { pendingIOCalls, transactionLoadingStates } from '~/wss/processVars'

import hosts from './hosts'
import clients from './clients'

export default new Page({
  name: 'WSS State',
  routes: {
    hosts,
    clients,
    pending_loading_calls: new Page({
      name: 'Pending IO calls',
      handler: async () => {
        const ioCalls = Array.from(pendingIOCalls.entries()).map(
          ([id, ioCall]) => ({ id, ioCall })
        )

        return new Layout({
          children: [
            io.display.table('Pending loading calls', {
              data: ioCalls,
              columns: [
                'id',
                {
                  label: 'ioCall',
                  renderCell: row => dedent`
                  ~~~json
                  ${row.ioCall}
                  ~~~
                  `,
                },
              ],
            }),
          ],
        })
      },
    }),
    pending_loading_states: new Page({
      name: 'Pending loading states',
      handler: async () => {
        const loadingStates = Array.from(
          transactionLoadingStates.entries()
        ).map(([id, state]) => ({ id, ...state }))

        return new Layout({
          children: [
            io.display.table('Loading states', {
              data: loadingStates,
              columns: [
                'id',
                'label',
                'description',
                'itemsInQueue',
                'itemsCompleted',
              ],
            }),
          ],
        })
      },
    }),
  },
})
