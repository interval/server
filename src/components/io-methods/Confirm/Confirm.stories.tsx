import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Component from '.'

export default {
  title: 'TransactionUI/Confirm',
  component: Component,
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => <Component {...args} />

export const Default = Template.bind({})
Default.args = {
  label: 'Delete this user account?',
  onUpdatePendingReturnValue: () => {
    /**/
  },
}

export const WithHelpText = Template.bind({})
WithHelpText.args = {
  ...Default.args,
  helpText:
    'All of their data will be deleted immediately and cannot be recovered.',
}

export const Inline = Template.bind({})
Inline.args = {
  ...Default.args,
  shouldUseAppendUi: true,
}

export const InlineWithHelpText = Template.bind({})
InlineWithHelpText.args = {
  ...Inline.args,
  helpText:
    'All of their data will be deleted **immediately** and cannot be recovered.\n\n- Account will be deleted\n- All of their data will be deleted\n- This cannot be undone\n\nSee here for more info: https://interval.com/docs',
}
