import React, { Suspense } from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Component from '.'

export default {
  title: 'TransactionUI/Display.HTML',
  component: Component,
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => (
  <Suspense fallback={<p>Loading...</p>}>
    <Component {...args} />
  </Suspense>
)

export const Default = Template.bind({})
Default.args = {
  label: 'One line',
  html: '<p><i>Hello</i>, <b>world</b>!</p>',
}

Default.parameters = {
  docs: {
    source: {
      code: 'Disabled for this story, see https://github.com/storybookjs/storybook/issues/11554',
    },
  },
}

export const Multiline = Template.bind({})
Multiline.args = {
  label: 'Multiple lines',
  html: `
    <p><i>Hello</i>, <b>world</b>!</p>
    <p><i>Hello</i>, <b>world</b>!</p>
    <p><i>Hello</i>, <b>world</b>!</p>
  `,
}

Multiline.parameters = {
  docs: {
    source: {
      code: 'Disabled for this story, see https://github.com/storybookjs/storybook/issues/11554',
    },
  },
}
