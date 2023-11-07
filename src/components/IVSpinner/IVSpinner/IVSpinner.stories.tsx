import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import IVSpinner from '.'

export default {
  title: 'Components/IVSpinner',
  component: IVSpinner,
} as Meta<typeof IVSpinner>

const Template: StoryFn<typeof IVSpinner> = args => <IVSpinner {...args} />

export const Default = Template.bind({})
Default.args = {}
