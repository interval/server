import React, { useState } from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Component from '.'
import ObjectViewer from '../ObjectViewer'

export default {
  title: 'Components/IVDatePicker',
  component: Component,
  parameters: {
    options: {
      enableShortcuts: false,
    },
  },
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => {
  const [value, setValue] = useState<unknown>()

  return (
    <div className="w-full h-screen flex flex-col items-center py-12 justify-start">
      <div className="w-[400px] space-y-6">
        <Component {...args} onChange={setValue} />
        <ObjectViewer data={value} />
      </div>
    </div>
  )
}

export const Default = Template.bind({})
Default.args = {}

export const WithValue = Template.bind({})
WithValue.args = {
  value: new Date(2020, 5, 28),
}

export const Disabled = Template.bind({})
Disabled.args = {
  disabled: true,
}

export const MinDate = Template.bind({})
MinDate.args = {
  minDate: new Date(),
}
