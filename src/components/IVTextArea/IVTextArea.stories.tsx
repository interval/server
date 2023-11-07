import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import IVTextArea from '.'

export default {
  title: 'Components/IVTextArea',
  component: IVTextArea,
} as Meta<typeof IVTextArea>

const Template: StoryFn<typeof IVTextArea> = args => <IVTextArea {...args} />

export const Default = Template.bind({})
Default.args = {}

export const Disabled = Template.bind({})
Disabled.args = { disabled: true }
