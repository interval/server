import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import IVAvatar from '.'

const Component = IVAvatar

export default {
  title: 'Components/IVAvatar',
  component: Component,
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => <Component {...args} />

export const WithoutImage = Template.bind({})
WithoutImage.args = {
  name: 'Alex Arena',
}

export const WithImage = Template.bind({})
WithImage.args = {
  name: 'Alex Arena',
  imageUrl:
    'https://interval-public.s3.us-west-1.amazonaws.com/user-photos/fa049063-7606-4b54-a577-dc0c6ed4efcb-1629131221197.jpg',
}

export const Larger = Template.bind({})
Larger.args = {
  name: 'Alex Arena',
  textSizeClassName: 'text-xl',
  className: 'w-14 h-14',
}

export const Roundrect = Template.bind({})
Roundrect.args = {
  name: 'Interval Corp',
  shape: 'roundrect',
}
