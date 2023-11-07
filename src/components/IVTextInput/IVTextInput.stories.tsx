import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import IVTextInput from '.'

export default {
  title: 'Components/IVTextInput',
  component: IVTextInput,
} as Meta<typeof IVTextInput>

const Template: StoryFn<typeof IVTextInput> = args => <IVTextInput {...args} />

export const Default = Template.bind({})
Default.args = {}

export const Disabled = Template.bind({})
Disabled.args = { disabled: true }
