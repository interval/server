import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Component from '.'
import {
  generateData,
  generateDenseData,
  mockColumns,
} from '~/../test/data/table'
import { faker } from '@faker-js/faker'
import { IVTableCells } from '~/components/IVTable/useTable'

export default {
  title: 'TransactionUI/Display.Table',
  component: Component,
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => <Component {...args} />

export const Default = Template.bind({})
Default.args = {
  label: 'Data table',
  helpText: 'This table contains examples of the four allowed data types.',
  data: generateData(5),
}

export const CustomColumnNames = Template.bind({})
CustomColumnNames.args = {
  label: 'Data table',
  columns: mockColumns.slice(1),
  data: generateData(5),
}

export const ManyColumns = Template.bind({})
ManyColumns.args = {
  label: 'Data table',
  data: generateDenseData(100),
}

export const EmptyTable = Template.bind({})
EmptyTable.args = {
  label: 'Data table',
  data: [],
}

export const VerticalTable = Template.bind({})
VerticalTable.args = {
  orientation: 'vertical',
  data: generateData(10),
}

export const HighlightedTable = Template.bind({})
HighlightedTable.args = {
  data: generateData(10).map((row, i) => {
    const status = faker.helpers.arrayElement([
      'Online',
      'Offline',
      'Error',
      'Unresponsive',
    ])
    const region = faker.helpers.arrayElement([
      'US East',
      'US West',
      'Europe',
      'Asia',
    ])
    const ip_address = faker.internet.ip()
    const ec2_instance_id = faker.datatype.uuid()
    const application = faker.helpers.arrayElement([
      'docs',
      'marketing-site',
      'api',
    ])

    const data: IVTableCells = {
      name: {
        label: `production-${i.toString().padStart(2, '0')}`,
      },
      status: {
        label: status,
        highlightColor:
          status === 'Online'
            ? 'green'
            : status === 'Error'
            ? 'red'
            : status === 'Unresponsive'
            ? 'yellow'
            : 'gray',
      },
      application: {
        label: application,
        // highlightColor:
        //   application === 'docs'
        //     ? 'blue'
        //     : application === 'api'
        //     ? 'pink'
        //     : 'orange',
      },
      region,
      ip_address: {
        label: ip_address,
        // highlightColor: faker.helpers.arrayElement([
        //   'red',
        //   'orange',
        //   'yellow',
        //   'green',
        //   'blue',
        //   'pink',
        //   'purple',
        //   'gray',
        // ]),
        url: `https://www.google.com/search?q=${ip_address}`,
      },
      ec2_instance_id,
    }

    return {
      key: row.key,
      data,
    }
  }),
}
