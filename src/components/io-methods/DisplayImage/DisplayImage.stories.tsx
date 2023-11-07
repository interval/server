import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Component from '.'

export default {
  title: 'TransactionUI/Display.Image',
  component: Component,
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => <Component {...args} />

export const Default = Template.bind({})
Default.args = {
  label: 'Sample image',
  url: 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png',
}
