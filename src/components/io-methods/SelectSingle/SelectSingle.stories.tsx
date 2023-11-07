import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Component from '.'

export default {
  title: 'TransactionUI/Select.Single',
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
  searchable: false,
  options: [
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

export const SelectUser = Template.bind({})
SelectUser.args = {
  searchable: true,
  label: 'Select a user',
  options: [
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

export const SelectUsers = Template.bind({})
SelectUsers.args = {
  searchable: true,
  label: 'Select a user',
  options: [
    {
      value: '1',
      label: 'Alex Arena',
      description: 'alex@interval.com',
      image: {
        url: 'https://placehold.co/100',
        size: 'large',
      },
    },
    {
      value: '2',
      label: 'Dan Philibin',
      description: 'dan@interval.com',
      image: {
        url: 'https://placehold.co/100',
        size: 'medium',
      },
    },
    {
      value: '3',
      label: 'Jacob Mischka',
      description: 'jacob@interval.com',
      image: {
        url: 'https://placehold.co/100',
        size: 'medium',
      },
    },
    {
      value: '4',
      label: 'Ryan Coppolo',
      description: 'ryan@interval.com',
      image: {
        url: 'https://placehold.co/100',
        size: 'medium',
      },
    },
    {
      value: '5',
      label: 'Kyle Sanok',
      description: 'kyle@interval.com',
      image: {
        url: 'https://placehold.co/100',
        size: 'medium',
      },
    },
  ],
  onUpdatePendingReturnValue: () => {
    /* */
  },
  onStateChange: () => {
    /**/
  },
}
