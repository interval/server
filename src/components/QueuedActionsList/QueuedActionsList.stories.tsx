import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import QueuedActionsList from '.'
import {
  mockQueuedAction,
  mockAction,
  mockActionMetadata,
  mockTransaction,
} from '~/utils/mockData'
import { faker } from '@faker-js/faker'

export default {
  title: 'Dashboard/QueuedActionsList',
  component: QueuedActionsList,
} as Meta<typeof QueuedActionsList>

const Template: StoryFn<typeof QueuedActionsList> = args => (
  <QueuedActionsList {...args} />
)

export const Default = Template.bind({})
Default.args = {
  mode: 'live',
  canDequeue: false,
  queuedActions: [
    {
      ...mockQueuedAction,
      params: null,
      action: {
        ...mockAction,
        metadata: mockActionMetadata,
      },
      transaction: null,
    },
  ],
}

export const WithParams = Template.bind({})
WithParams.args = {
  mode: 'live',
  canDequeue: false,
  queuedActions: [
    {
      ...mockQueuedAction,
      params: {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        email: faker.internet.email(),
        id: faker.datatype.uuid(),
        isVerified: faker.datatype.boolean(),
      },
      action: {
        ...mockAction,
        metadata: mockActionMetadata,
      },
      transaction: null,
    },
  ],
}

export const InProgress = Template.bind({})
InProgress.args = {
  mode: 'live',
  queuedActions: [
    {
      ...mockQueuedAction,
      params: {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        email: faker.internet.email(),
        id: faker.datatype.uuid(),
        isVerified: faker.datatype.boolean(),
      },
      action: {
        ...mockAction,
        metadata: mockActionMetadata,
      },
      transaction: mockTransaction,
    },
  ],
}
