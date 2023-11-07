import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import Component from '.'
import { faker } from '@faker-js/faker'

export default {
  title: 'Components/KeyValueTable',
  component: Component,
} as Meta<typeof Component>

const Template: StoryFn<typeof Component> = args => <Component {...args} />

export const Default = Template.bind({})
Default.args = {
  data: {
    string: 'string',
    number: 123,
    boolean: true,
    date: new Date(),
    // bigint breaks storybook: https://github.com/storybookjs/storybook/issues/13950
    // bigint: BigInt(123),
    null: null,
    undefined: undefined,
    link: 'https://interval.com/' + faker.random.alpha(60),
    veryLongString: faker.random.alpha(120),
    paragraphs: faker.lorem.paragraphs(3, '\n\n'),
  },
}
