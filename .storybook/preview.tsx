import React from 'react'
import '../src/styles/globals.css'
import 'react-loading-skeleton/dist/skeleton.css'
import { MemoryRouter } from 'react-router-dom'
import { useState } from 'react'
import { clientConfig, trpc } from '../src/utils/trpc'
import { QueryClient, QueryClientProvider } from 'react-query'
import {
  DashboardContext,
  DashboardContextValue,
} from '../src/components/DashboardContext'
import { StoryContext } from '@storybook/addons'
import { RenderContextProvider } from '~/components/RenderContext'
import { RecoilRoot } from 'recoil'

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
}
export const decorators = [
  (Story, ctx: StoryContext) => {
    const [queryClient] = useState(() => new QueryClient())
    const [trpcClient] = useState(() => trpc.createClient(clientConfig))

    const classNames = ['p-4', 'text-gray-600']

    // the <form> container in <RenderPendingIOCall /> applies `.text-sm` to all transaction components
    if (
      ctx.kind.startsWith('TransactionUI') &&
      !ctx.kind.includes('Presentation')
    ) {
      classNames.push('text-sm')
    }

    return (
      <RecoilRoot>
        <MemoryRouter>
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              <DashboardContext.Provider
                value={
                  {
                    organization: {
                      id: '0',
                      name: 'Interval',
                      slug: 'interval',
                      ownerId: '0',
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    },
                  } as DashboardContextValue
                }
              >
                <RenderContextProvider
                  getActionUrl={() => '#'}
                  getUploadUrls={() => Promise.resolve(undefined)}
                >
                  <div className={classNames.join(' ')}>
                    <div>
                      <Story />
                    </div>
                  </div>
                </RenderContextProvider>
              </DashboardContext.Provider>
            </QueryClientProvider>
          </trpc.Provider>
        </MemoryRouter>
      </RecoilRoot>
    )
  },
]
