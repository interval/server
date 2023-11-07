import React, { Suspense } from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Component from '.'

export default {
  title: 'TransactionUI/Display.Markdown',
  component: Component,
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => (
  <Suspense fallback={<p>Loading...</p>}>
    <Component {...args} />
  </Suspense>
)

export const Default = Template.bind({})
Default.args = {
  label: '**Warning:** this _will_ erase user data.',
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
  label: `
    ## Heading 2

    ### Heading 3

    - Bullet 1
    - Bullet 2
      > Blockquote inside list

    1. Ordered
    2. Ordered
    3. \`inline_code\`

    [Link](https://interval.com)

    ~~~
    Here's an untagged code block
    ~~~

    ~~~ts
    io.display.markdown("Here's a TypeScript code block")
    ~~~
  `,
}

Multiline.parameters = {
  docs: {
    source: {
      code: 'Disabled for this story, see https://github.com/storybookjs/storybook/issues/11554',
    },
  },
}
