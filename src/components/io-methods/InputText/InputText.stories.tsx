import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Component from '.'

export default {
  title: 'TransactionUI/Input.Text',
  component: Component,
  parameters: { layout: 'centered' },
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => <Component {...args} />

const shared = {
  onUpdatePendingReturnValue: () => {
    /**/
  },
  onStateChange: () => {
    /**/
  },
}

export const Default = Template.bind({})
Default.args = {
  ...shared,
  label: 'First name',
}

export const Multiline = Template.bind({})
Multiline.args = {
  label: 'Description',
  placeholder: 'Optional',
  multiline: true,
  lines: 4,
  isOptional: true,
  minLength: 20,
  maxLength: 200,
  ...shared,
}

export const HelpText = Template.bind({})
HelpText.args = {
  ...shared,
  label: 'Username',
  helpText:
    'Letters, numbers, and underscores only. [See the guidelines for more info](https://example.com).',
}
