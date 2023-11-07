import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Component from '.'

export default {
  title: 'TransactionUI/Upload.File',
  component: Component,
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => <Component {...args} />

export const Default = Template.bind({})
Default.args = {
  label: 'Upload a file',
  onUpdatePendingReturnValue: () => {
    /**/
  },
  onStateChange: () => {
    /**/
  },
}

export const Image = Template.bind({})
Image.args = {
  label: 'Upload an image',
  helpText: 'Mostly any image allowed',
  allowedExtensions: ['.jpg', '.jpeg', '.png'],
  onUpdatePendingReturnValue: () => {
    /**/
  },
  onStateChange: () => {
    /**/
  },
}
