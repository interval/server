import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import IVButton from '.'

const Component = IVButton

export default {
  title: 'Components/IVButton',
  component: Component,
  decorators: [storyFn => <div className="max-w-xs mx-auto">{storyFn()}</div>],
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => <Component {...args} />

export const Default = Template.bind({})
Default.args = {
  theme: 'primary',
  label: 'Log in',
  disabled: false,
  loading: false,
}

export const Secondary = Template.bind({})
Secondary.args = {
  theme: 'secondary',
  label: 'Sign up',
  disabled: false,
  loading: false,
}

export const Danger = Template.bind({})
Danger.args = {
  theme: 'danger',
  label: 'Delete',
  disabled: false,
  loading: false,
}

export const Disabled = Template.bind({})
Disabled.args = {
  disabled: true,
  label: 'Log in',
}

export const Loading = Template.bind({})
Loading.args = {
  label: 'Log in',
  loading: true,
}

export const Condensed = Template.bind({})
Condensed.args = {
  theme: 'primary',
  label: 'Run action',
  disabled: false,
  loading: false,
  condensed: true,
}

export const WithOptions = Template.bind({})
WithOptions.args = {
  label: 'Run action',
  theme: 'secondary',
  condensed: false,
  options: [
    {
      label: 'Re-assign',
      onClick: () => {
        /* */
      },
    },
    {
      label: 'Cancel',
      onClick: () => {
        /* */
      },
    },
  ],
}
