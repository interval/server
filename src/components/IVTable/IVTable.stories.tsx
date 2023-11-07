import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Component, { IVTableProps } from '.'
import { faker } from '@faker-js/faker'
import useTable, { IVTableCells, IVTableRow, UseTableProps } from './useTable'

export default {
  title: 'Components/IVTable',
  component: Component,
} as Meta<typeof Component>

const Template: StoryFn<typeof TableContainer> = args => (
  <TableContainer {...args} />
)

function TableContainer({
  data,
  columns,
  defaultPageSize,
  isSelectable,
  ...props
}: UseTableProps & Pick<IVTableProps, 'orientation' | 'fixedWidthColumns'>) {
  const table = useTable({
    columns,
    data,
    defaultPageSize,
    isSelectable,
    isDownloadable:
      'isDownloadable' in props ? props.isDownloadable : undefined,
  })

  return <Component table={table} {...props} />
}

function generateMockData({
  rows,
  withMenus,
}: {
  rows: number
  columns?: 'firstName' | 'lastName'[]
  withMenus?: boolean
}) {
  const mockData: IVTableRow[] = []
  for (let i = 0; i < rows; i++) {
    const firstName = faker.name.firstName()
    const lastName = faker.name.lastName()

    const data = {
      firstName,
      lastName,
      // header longer than its contents
      favoriteNumber: faker.datatype.number({ min: 0, max: 10 }),
      // long header with word breaks
      'least favorite number': faker.datatype.number({ min: 0, max: 10 }),
      email: faker.internet.email(firstName, lastName),
      phone: faker.phone.phoneNumber(),
      bio: faker.lorem.lines(),
      // long URLs
      websiteUrl: `${faker.internet.url()}/${faker.internet.domainWord()}/${faker.internet.domainWord()}/${faker.internet.domainWord()}?${faker.internet.domainWord()}=${faker.internet.domainWord()}`,
      address1: faker.address.streetAddress(),
      address2: faker.address.secondaryAddress(),
      city: faker.address.city(),
      state: faker.address.stateAbbr(),
      zip: faker.address.zipCode(),
    }

    mockData.push({
      key: faker.datatype.uuid(),
      data,
      rawData: data,
      filterValue: Object.values(data).join(' '),
      menu: withMenus
        ? [
            {
              label: 'Edit',
              onClick: () => {
                console.log('edit')
              },
            },
            {
              label: 'Delete',
              theme: 'danger',
              onClick: () => {
                console.log('delete')
              },
            },
          ]
        : undefined,
    } as IVTableRow)
  }
  return mockData
}

const mockColumns = Object.keys(generateMockData({ rows: 1 })[0].data)

export const Default = Template.bind({})
Default.args = {
  data: generateMockData({ rows: 25 }),
  columns: mockColumns,
  isDownloadable: false,
  fixedWidthColumns: false,
}

export const Vertical = Template.bind({})
Vertical.args = {
  orientation: 'vertical',
  data: generateMockData({ rows: 5, withMenus: true }),
  columns: mockColumns,
  isDownloadable: true,
  isSelectable: false,
}

export const Paginated = Template.bind({})
Paginated.args = {
  data: generateMockData({ rows: 300 }),
  columns: mockColumns,
  defaultPageSize: 50,
  fixedWidthColumns: false,
}

export const SelectableRows = Template.bind({})
SelectableRows.args = {
  data: generateMockData({ rows: 300, withMenus: true }),
  columns: mockColumns,
  defaultPageSize: 50,
  isSelectable: true,
  orientation: 'horizontal',
  fixedWidthColumns: false,
}

export const fixedWidthColumns = Template.bind({})
fixedWidthColumns.args = {
  data: generateMockData({ rows: 300, withMenus: true }),
  columns: mockColumns,
  defaultPageSize: 50,
  isSelectable: true,
  orientation: 'horizontal',
  fixedWidthColumns: true,
}

export const Downloadable = Template.bind({})
Downloadable.args = {
  data: generateMockData({ rows: 53 }),
  columns: mockColumns,
  defaultPageSize: 10,
  isSelectable: true,
  isDownloadable: true,
}

export const Dropdowns = Template.bind({})
Dropdowns.args = {
  data: generateMockData({ rows: 53, withMenus: true }),
  columns: mockColumns,
  defaultPageSize: 10,
  isSelectable: true,
  isDownloadable: true,
}

export const SmallData = Template.bind({})
SmallData.args = {
  columns: ['name', 'bio'],
  defaultPageSize: 10,
  isSelectable: true,
  isDownloadable: true,
  fixedWidthColumns: false,
  data: (() => {
    const mockData: IVTableRow[] = []
    for (let i = 0; i < 5; i++) {
      const name = faker.name.fullName()
      const bio = faker.lorem.word()

      const data = {
        name,
        bio,
      }

      mockData.push({
        key: faker.datatype.uuid(),
        data,
        rawData: data,
        filterValue: Object.values(data).join(' '),
        menu: [
          {
            label: 'Edit',
            onClick: () => {
              console.log('edit')
            },
          },
        ],
      } as IVTableRow)
    }
    return mockData
  })(),
}

export const HighlightedCells = Template.bind({})
HighlightedCells.args = {
  columns: [
    'name',
    'status',
    'application',
    'region',
    'ip_address',
    'ec2_instance_id',
  ],
  isSelectable: true,
  isDownloadable: true,
  fixedWidthColumns: false,
  data: (() => {
    const mockData: IVTableRow[] = []
    for (let i = 1; i < 16; i++) {
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

      mockData.push({
        key: faker.datatype.uuid(),
        data,
        rawData: data,
        filterValue: Object.values(data).join(' '),
        menu: [
          {
            label: 'Edit',
            onClick: () => {
              console.log('edit')
            },
          },
        ],
      } as IVTableRow)
    }
    return mockData
  })(),
}

export const HighlightedRows = Template.bind({})
HighlightedRows.args = {
  columns: ['name', 'status', 'region'],
  isSelectable: true,
  isDownloadable: true,
  fixedWidthColumns: false,
  data: (() => {
    const mockData: IVTableRow[] = []
    for (let i = 1; i < 16; i++) {
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

      const highlightColor = status === 'Error' ? 'red' : undefined

      const data: IVTableCells = {
        name: {
          label: `production-${i.toString().padStart(2, '0')}`,
          highlightColor,
        },
        status: {
          label: status,
          highlightColor,
        },
        region: {
          label: region,
          highlightColor,
        },
      }

      mockData.push({
        key: faker.datatype.uuid(),
        data,
        rawData: data,
        filterValue: Object.values(data).join(' '),
        menu: [
          {
            label: 'Edit',
            onClick: () => {
              console.log('edit')
            },
          },
        ],
      } as IVTableRow)
    }
    return mockData
  })(),
}
