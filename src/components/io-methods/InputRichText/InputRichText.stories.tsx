import React, { Suspense } from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Component from '.'
import IVSpinner from '~/components/IVSpinner'

export default {
  title: 'TransactionUI/Input.RichText',
  component: Component,
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => (
  <div>
    <Suspense fallback={<IVSpinner />}>
      <Component {...args} />
    </Suspense>
  </div>
)

export const Default = Template.bind({})
Default.parameters = {
  docs: {
    source: {
      code: 'Disabled for this story, see https://github.com/storybookjs/storybook/issues/11554',
    },
  },
}
Default.args = {
  label: 'Email body',
  placeholder: 'Hello, world!',
  onUpdatePendingReturnValue: () => {
    /**/
  },
  onStateChange: () => {
    /**/
  },
}
