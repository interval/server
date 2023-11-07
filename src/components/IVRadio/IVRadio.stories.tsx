import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import IVRadio from '.'

const Component = IVRadio

export default {
  title: 'Components/IVRadio',
  component: Component,
  decorators: [storyFn => <div className="max-w-xs mx-auto">{storyFn()}</div>],
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => <Component {...args} />

export const Default = Template.bind({})
Default.args = {
  id: 'checkbox',
  checked: false,
  label: 'Subscribe to email notifications',
  disabled: false,
}

export const Checked = Template.bind({})
Checked.args = {
  id: 'checkbox',
  checked: true,
  label: 'Subscribe to email notifications',
  disabled: false,
}

export const Disabled = Template.bind({})
Disabled.args = {
  id: 'checkbox',
  checked: false,
  label: 'Subscribe to email notifications',
  disabled: true,
}

export const WithHelpText = Template.bind({})
WithHelpText.args = {
  id: 'checkbox',
  checked: false,
  label: <strong className="font-medium">Comments</strong>,
  disabled: false,
  helpText: 'Get notified when someone comments on your post',
}
