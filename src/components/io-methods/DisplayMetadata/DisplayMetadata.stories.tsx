import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Component from '.'
import { faker } from '@faker-js/faker'

export default {
  title: 'TransactionUI/Display.Metadata',
  component: Component,
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => <Component {...args} />

export const Default = Template.bind({})
Default.args = {
  label: 'Customer information',
  data: [
    {
      label: 'Starts at',
      value: faker.date.future(),
    },
    {
      label: 'Location',
      value: faker.address.city(),
    },
    {
      label: 'Duration',
      value: 60,
    },
    {
      label: 'Amount',
      value: '$25',
    },
    {
      label: 'Supported types',
      value: ['Card', 'Apple Pay', 'Google Pay'].join(', '),
    },
    {
      label: 'Description',
      value: faker.lorem.paragraphs(2, '\n\n'),
    },
    {
      label: 'Long string',
      value: faker.random.alpha(256),
    },
    {
      label: 'veryLongUnbrokenKeyString',
      value: faker.random.alpha(32),
    },
    {
      label: 'Very long label wrapping to two lines',
      value: faker.random.alpha(32),
    },
    {
      label: 'Long URL',
      value:
        'https://interval.com/dashboard/interval/actions/classes/view/' +
        faker.random.alpha(60),
    },
  ],
}

export const CardLayout = Template.bind({})
CardLayout.args = {
  layout: 'card',
  data: [
    {
      label: 'Users',
      value: 27,
    },
    {
      label: 'Purchases',
      value: 7230,
    },
    {
      label: 'Revenue',
      value: '$1,000,000',
    },
    {
      label: 'Long value',
      value: faker.lorem.words(6),
    },
    {
      label: 'Long string',
      value: faker.random.alpha(60),
    },
    {
      label: 'URL',
      value: 'https://interval.com/dashboard/interval/actions/classes/view',
    },
  ],
}

export const ListLayout = Template.bind({})
ListLayout.args = {
  layout: 'list',
  data: Default.args.data,
}
