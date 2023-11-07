import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Component, { Result } from '.'

export default {
  title: 'TransactionUI/Search',
  component: Component,
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => (
  <div>
    <Component {...args} />
  </div>
)

export const Default = Template.bind({})
Default.args = {
  label: 'Select a role',
  results: [
    {
      label: 'Admin',
      value: 'admin',
    },
    {
      label: 'Editor',
      value: 'editor',
    },
    {
      label: 'Viewer',
      value: 'viewer',
    },
  ],
  onUpdatePendingReturnValue: () => {
    /**/
  },
  onStateChange: () => {
    /**/
  },
}

export const Search = Template.bind({})
Search.args = {
  label: 'Select a user',
  results: [
    {
      value: '1',
      label: 'Alex Arena',
    },
    {
      value: '2',
      label: 'Dan Philibin',
    },
    {
      value: '3',
      label: 'Jacob Mischka',
    },
    {
      value: '4',
      label: 'Ryan Coppolo',
    },
    {
      value: '5',
      label: 'Kyle Sanok',
    },
    {
      value: '6',
      label: 'Alex Arena (2)',
    },
    {
      value: '7',
      label: 'Dan Philibin (2)',
    },
    {
      value: '8',
      label: 'Jacob Mischka (2)',
    },
    {
      value: '9',
      label: 'Ryan Coppolo (2)',
    },
    {
      value: '10',
      label: 'Kyle Sanok (2)',
    },
  ],
  onUpdatePendingReturnValue: () => {
    /* */
  },
  onStateChange: () => {
    /**/
  },
}

const users: Result[] = [
  {
    value: '1',
    label: 'Alex Arena',
    description: 'alex@interval.com',
    image: {
      url: 'https://picsum.photos/100',
    },
  },
  {
    value: '2',
    label: 'Dan Philibin',
    description: 'dan@interval.com',
    image: {
      url: 'https://picsum.photos/100',
    },
  },
  {
    value: '3',
    label: 'Jacob Mischka',
    description: 'jacob@interval.com',
    image: {
      url: 'https://picsum.photos/100',
    },
  },
  {
    value: '4',
    label: 'Ryan Coppolo',
    description: 'ryan@interval.com',
    image: {
      url: 'https://picsum.photos/100',
    },
  },
  {
    value: '5',
    label: 'Kyle Sanok',
    description: 'kyle@interval.com',
    image: {
      url: 'https://picsum.photos/100',
    },
  },
]

export const Thumbnails = Template.bind({})
Thumbnails.args = {
  label: 'Thumbnails',
  results: users,
  onUpdatePendingReturnValue: () => {
    /* */
  },
  onStateChange: () => {
    /**/
  },
}

export const SmallThumbnails = Template.bind({})
SmallThumbnails.args = {
  label: 'Small thumbnails',
  results: users.map(u => ({
    ...u,
    image: { ...u.image, size: 'small' },
  })) as Result[],
  onUpdatePendingReturnValue: () => {
    /* */
  },
  onStateChange: () => {
    /**/
  },
}

export const MediumThumbnails = Template.bind({})
MediumThumbnails.args = {
  label: 'Medium thumbnails',
  results: users.map(u => ({
    ...u,
    image: { ...u.image, size: 'medium' },
  })) as Result[],
  onUpdatePendingReturnValue: () => {
    /* */
  },
  onStateChange: () => {
    /**/
  },
}

export const LargeThumbnails = Template.bind({})
LargeThumbnails.args = {
  label: 'Large thumbnails',
  results: users.map(u => ({
    ...u,
    image: { ...u.image, size: 'large' },
  })) as Result[],
  onUpdatePendingReturnValue: () => {
    /* */
  },
  onStateChange: () => {
    /**/
  },
}
