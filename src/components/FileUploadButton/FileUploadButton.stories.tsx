import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import FileUploadButton from '.'

export default {
  title: 'Components/FileUploadButton',
  component: FileUploadButton,
} as Meta<typeof FileUploadButton>

const Template: StoryFn<typeof FileUploadButton> = args => (
  <FileUploadButton {...args} />
)

export const Default = Template.bind({})
Default.args = {
  id: 'default',
  currentStep: 'default',
  onChange: () => {
    /* */
  },
}

export const Uploading = Template.bind({})
Uploading.args = {
  id: 'uploading',
  currentStep: 'uploading',
  onChange: () => {
    /* */
  },
}

export const Success = Template.bind({})
Success.args = {
  id: 'success',
  currentStep: 'success',
  value: [new File([], '62d7e4dc-d58e-4f15-a8e4-29fc15c26281.png')],
  onChange: () => {
    /* */
  },
  onReset: () => {
    /* */
  },
}

export const Error = Template.bind({})
Error.args = {
  id: 'error',
  currentStep: 'error',
  onChange: () => {
    /* */
  },
}
