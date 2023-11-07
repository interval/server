import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Indeterminate from './Indeterminate'

export default {
  title: 'TransactionUI/LoadingState/Indeterminate',
  component: Indeterminate,
} as Meta<typeof Indeterminate>

const IndeterminateTemplate: StoryFn<typeof Indeterminate> = args => (
  <Indeterminate {...args} />
)

export const Default = IndeterminateTemplate.bind({})
Default.args = {
  label: 'Fetching communities...',
}

export const WithDescription = IndeterminateTemplate.bind({})
WithDescription.args = {
  label: 'Fetching communities...',
  description: 'This may take a while.',
}
