import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Component from './InlineLoading'

export default {
  title: 'TransactionUI/LoadingState/Inline',
  component: Component,
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => <Component {...args} />

export const Default = Template.bind({})
Default.args = {
  label: 'Fetching communities...',
}

export const WithDescription = Template.bind({})
WithDescription.args = {
  label: 'Fetching communities...',
  description: 'This may take a while.',
}

export const ProgressDefault = Template.bind({})
ProgressDefault.args = {
  label: 'Processing refunds...',
  description: '',
  itemsCompleted: 0,
  itemsInQueue: 10,
}

export const ProgressWithDescription = Template.bind({})
ProgressWithDescription.args = {
  label: 'Processing refunds...',
  description: 'Each refund will take about 5 seconds to process.',
  itemsCompleted: 0,
  itemsInQueue: 10,
}

export const ProgressHalfway = Template.bind({})
ProgressHalfway.args = {
  label: 'Processing refunds...',
  description: '',
  itemsCompleted: 5,
  itemsInQueue: 10,
}

export const ProgressLarge = Template.bind({})
ProgressLarge.args = {
  label: 'This may take a while...',
  description: '',
  itemsCompleted: 17,
  itemsInQueue: 2000,
}
