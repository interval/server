import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Progress from './Progress'

export default {
  title: 'TransactionUI/LoadingState/Progress',
  component: Progress,
} as Meta<typeof Progress>

const ProgressTemplate: StoryFn<typeof Progress> = args => (
  <Progress {...args} />
)

export const Default = ProgressTemplate.bind({})
Default.args = {
  label: 'Processing refunds...',
  description: '',
  itemsCompleted: 0,
  itemsInQueue: 10,
}

export const WithDescription = ProgressTemplate.bind({})
WithDescription.args = {
  label: 'Processing refunds...',
  description: 'Each refund will take about 5 seconds to process.',
  itemsCompleted: 0,
  itemsInQueue: 10,
}

export const Halfway = ProgressTemplate.bind({})
Halfway.args = {
  label: 'Processing refunds...',
  description: '',
  itemsCompleted: 5,
  itemsInQueue: 10,
}

export const Large = ProgressTemplate.bind({})
Large.args = {
  label: 'This may take a while...',
  description: '',
  itemsCompleted: 17,
  itemsInQueue: 2000,
}
