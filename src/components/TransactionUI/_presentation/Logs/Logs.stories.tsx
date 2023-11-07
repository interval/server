import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Component from '.'

export default {
  title: 'TransactionUI/Presentation/Logs',
  component: Component,
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => <Component {...args} />

export const Default = Template.bind({})
Default.args = {
  logs: [
    'Deleted 1 subscription',
    'Deleted 27 post drafts',
    'Skipped 13 published posts',
    '> View published posts here: https://interval.com/blog/author/storybook (text after link) <p>',
    'Deleted 13 comments',
  ],
  isCompleted: true,
}

export const Empty = Template.bind({})
Empty.args = {
  logs: [],
  isCompleted: false,
}
