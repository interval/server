import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import IVRichTextEditor from '.'

export default {
  title: 'Components/IVRichTextEditor',
  component: IVRichTextEditor,
} as Meta<typeof IVRichTextEditor>

const Template: StoryFn<typeof IVRichTextEditor> = args => (
  <IVRichTextEditor {...args} />
)

export const Default = Template.bind({})
Default.args = {
  defaultValue: '<h2>Hello!</h2>',
  onChange: () => {
    /* */
  },
}

export const Disabled = Template.bind({})
Disabled.args = {
  disabled: true,
  onChange: () => {
    /* */
  },
}
