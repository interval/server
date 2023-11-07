import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Component from '.'

export default {
  title: 'TransactionUI/Select.Multiple',
  component: Component,
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => <Component {...args} />

export const Default = Template.bind({})
Default.args = {
  options: [
    { label: 'Create', value: 'create' },
    { label: 'Read', value: 'read' },
    { label: 'Update', value: 'update' },
    { label: 'Delete', value: 'delete' },
  ],
  onUpdatePendingReturnValue: () => {
    /**/
  },
  onStateChange: () => {
    /**/
  },
}
