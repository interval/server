import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Component from '.'

export default {
  title: 'TransactionUI/Display.Object',
  component: Component,
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => <Component {...args} />

export const Default = Template.bind({})
Default.args = {
  data: {
    isTrue: true,
    isFalse: false,
    number: 15,
    nullValue: null,
    nested: {
      name: 'Interval',
    },
    longList: Array(100)
      .fill(0)
      .map((_, i) => `Item ${i}`),
  },
}
