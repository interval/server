import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Component from '.'
import { faker } from '@faker-js/faker'

export default {
  title: 'TransactionUI/Select.Table',
  component: Component,
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => <Component {...args} />

function generateData(count: number) {
  return Array.from({ length: count }, (_, key) => {
    return {
      key: key.toString(),
      data: {
        string: faker.animal.bird(),
        number: faker.datatype.number(),
        boolean: faker.datatype.boolean(),
        null: null,
      },
    }
  })
}

export const Default = Template.bind({})
Default.args = {
  label: 'Default',
  data: generateData(5),
  onUpdatePendingReturnValue: () => {
    /* */
  },
  onStateChange: () => {
    /**/
  },
}

export const Paginated = Template.bind({})
Paginated.args = {
  label: 'Paginated data',
  data: generateData(53),
  onUpdatePendingReturnValue: () => {
    /* */
  },
  onStateChange: () => {
    /**/
  },
}

export const CustomColumnNames = Template.bind({})
CustomColumnNames.args = {
  label: 'Custom column names',
  columns: Object.keys(generateData(1)[0]).map(label => ({ label })),
  helpText: 'This table contains examples of the four allowed data types.',
  data: generateData(5),
  onUpdatePendingReturnValue: () => {
    /* */
  },
  onStateChange: () => {
    /**/
  },
}

export const EmptyTable = Template.bind({})
EmptyTable.args = {
  label: 'Refunds issued',
  data: [],
  onUpdatePendingReturnValue: () => {
    /* */
  },
  onStateChange: () => {
    /**/
  },
}
