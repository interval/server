import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Component from '.'

export default {
  title: 'TransactionUI/ListProgress',
  component: Component,
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => <Component {...args} />

export const Default = Template.bind({})
Default.args = {
  label: 'Refunds',
  items: [
    {
      label: 'alex@interval.com',
      isComplete: true,
      resultDescription: 'Refunded $5.00',
    },
    {
      label: 'dan@interval.com',
      isComplete: true,
      resultDescription: 'Refunded $5.00',
    },
    {
      label: 'jacob@interval.com',
      isComplete: false,
      resultDescription: null,
    },
    {
      label: 'ryan@interval.com',
      isComplete: false,
      resultDescription: null,
    },
  ],
}
