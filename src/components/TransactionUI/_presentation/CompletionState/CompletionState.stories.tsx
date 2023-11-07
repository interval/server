import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Component from '.'
import {
  mockTransaction,
  mockAction,
  mockActionMetadata,
} from '~/utils/mockData'
import { ParsedActionReturnData } from '@interval/sdk/dist/ioSchema'
import { TransactionResultStatus } from '@prisma/client'
import * as pkg from '@interval/sdk/package.json'

export default {
  title: 'TransactionUI/Presentation/CompletionState',
  component: Component,
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => (
  <div className="w-full px-8">
    <Component {...args} />
  </div>
)

const transaction = {
  ...mockTransaction,
  action: {
    ...mockAction,
    metadata: mockActionMetadata,
  },
  logs: [],
  queuedAction: null,
  completedAt: new Date(),
  resultStatus: 'SUCCESS' as TransactionResultStatus,
  resultSchemaVersion: 1,
  resultData: {
    name: 'Interval',
    email: 'accounts@interval.com',
    favoriteNumber: 15,
    isSubscribed: true,
    url: 'https://interval.com',
  },
  owner: { email: 'owner@example.com' },
  hostInstance: {
    sdkName: pkg.name,
    sdkVersion: pkg.version,
  },
}

export const Default = Template.bind({})
Default.args = {
  transaction,
}

export const Array = Template.bind({})
Array.args = {
  transaction: {
    ...transaction,
    resultData: [{ a: 1, b: 2 }],
  },
}

export const String = Template.bind({})
String.args = {
  transaction: {
    ...transaction,
    resultData: 'Just a humble string.\n\nIt has line breaks.',
  },
}

export const Number = Template.bind({})
Number.args = {
  transaction: {
    ...transaction,
    resultData: 420.69,
  },
}

export const Boolean = Template.bind({})
Boolean.args = {
  transaction: {
    ...transaction,
    resultData: false,
  },
}

export const ErrorState = Template.bind({})
ErrorState.args = {
  transaction: {
    ...transaction,
    resultStatus: 'FAILURE',
    resultData: JSON.stringify({
      message: 'You are not allowed to perform this action.',
    } as ParsedActionReturnData),
  },
}
