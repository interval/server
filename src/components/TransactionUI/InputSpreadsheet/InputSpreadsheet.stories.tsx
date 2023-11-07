import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Component from '.'

export default {
  title: 'TransactionUI/Input.Spreadsheet',
  component: Component,
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => (
  <div className="p-8 w-screen">
    <Component {...args} />
  </div>
)

// TODO:
// - more column types (boolean, number, required, etc)
// - stories with prefilled data

export const Default = Template.bind({})
Default.args = {
  label: 'Spreadsheet',
  columns: {
    email: 'string',
    fullName: 'string?',
    number: 'number?',
    isVerified: 'boolean',
  },
  onUpdatePendingReturnValue: () => {
    /**/
  },
  onStateChange: () => {
    /**/
  },
}

const mockRow = {
  email: 'accounts@interval.com',
  fullName: 'Interval',
  number: 15,
  isVerified: true,
}

export const Prefilled = Template.bind({})
Prefilled.parameters = {
  options: {
    enableShortcuts: false,
  },
}
Prefilled.args = {
  label: 'Spreadsheet',
  data: [mockRow, mockRow, mockRow, mockRow, mockRow],
  columns: {
    email: 'string',
    fullName: 'string?',
    number: 'number?',
    isVerified: 'boolean',
  },
  onUpdatePendingReturnValue: () => {
    /**/
  },
  onStateChange: () => {
    /**/
  },
}

const mockDataWithAnError: (typeof mockRow)[] = []

for (let i = 0; i < 60; i++) {
  mockDataWithAnError.push({
    ...mockRow,
    // @ts-ignore - intentionally allow null
    email: (i > 51 && i < 54) || i === 15 ? null : mockRow.email,
    // @ts-ignore - intentionally allow strings
    number: i === 55 ? 'abcd' : mockRow.number,
  })
}

export const PaginatedErrors = Template.bind({})
PaginatedErrors.parameters = {
  options: {
    enableShortcuts: false,
  },
}
PaginatedErrors.args = {
  label: 'Spreadsheet',
  columns: {
    email: 'string',
    fullName: 'string?',
    number: 'number?',
    isVerified: 'boolean',
  },
  data: mockDataWithAnError,
  onUpdatePendingReturnValue: () => {
    /**/
  },
  onStateChange: () => {
    /**/
  },
}
