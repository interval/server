import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import IVSelect from '.'

const Component = IVSelect

export default {
  title: 'Components/IVSelect',
  component: Component,
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => <Component {...args} />

const options = [
  {
    label: 'Alex Arena',
    value: 'alex-arena',
  },
  {
    label: 'Dan Philibin',
    value: 'dan-philibin',
  },
  {
    label: 'Jacob Mischka',
    value: 'jacob-mischka',
  },
  {
    label: 'Ryan Coppolo',
    value: 'ryan-coppolo',
  },
]

export const Default = Template.bind({})
Default.args = {
  options,
  disabled: false,
}

export const Disabled = Template.bind({})
Disabled.args = {
  options,
  disabled: true,
}
