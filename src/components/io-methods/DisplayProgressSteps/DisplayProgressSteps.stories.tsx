import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Component from '.'

export default {
  title: 'TransactionUI/Display.ProgressSteps',
  component: Component,
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => <Component {...args} />

export const Default = Template.bind({})
Default.args = {
  label: 'Exporting communities',
  subTitle: "We're exporting all communities. This may take a while.",
  currentStep: 'movement-studio',
  steps: {
    completed: 1,
    total: 3,
  },
}
