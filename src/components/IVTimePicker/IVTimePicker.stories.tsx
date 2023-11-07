import React, { useState } from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Component from '.'
import ObjectViewer from '~/components/ObjectViewer'
import { IVTimePickerProps } from '~/components/IVDateTimePicker/datePickerUtils'

export default {
  title: 'Components/IVTimePicker',
  component: Component,
  parameters: {
    options: {
      enableShortcuts: false,
    },
  },
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => {
  const [value, setValue] = useState<IVTimePickerProps['value'] | null>(
    args.value
  )

  return (
    <div className="w-full h-screen flex flex-col items-center py-12 justify-start">
      <div className="w-[400px] space-y-6">
        <Component {...args} value={value} onChange={setValue} />
        <ObjectViewer data={value} />
      </div>
    </div>
  )
}

export const Default = Template.bind({})
Default.args = {}

export const WithValue = Template.bind({})
WithValue.args = {
  value: { hour: 8, minute: 12 },
}
