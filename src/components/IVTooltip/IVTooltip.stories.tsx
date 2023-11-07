import React from 'react'
import { StoryFn, Meta } from '@storybook/react'
import IVTooltip from '.'
import IVButton from '~/components/IVButton'

export default {
  title: 'Components/IVTooltip',
  component: IVTooltip,
} as Meta<typeof IVTooltip>

const Template: StoryFn<typeof IVTooltip> = args => (
  <div>
    <IVTooltip {...args}>
      <IVButton theme="primary" label="Add user" disabled />
    </IVTooltip>
  </div>
)

export const Default = Template.bind({})
Default.args = {
  text: 'This is a tooltip',
  placement: 'top',
}

export const LongText = Template.bind({})
LongText.args = {
  text: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quod quis atque adipisci ut praesentium quidem unde, ratione soluta voluptas consectetur deleniti nesciunt nobis ipsam earum aperiam impedit dignissimos? Veritatis, perspiciatis.',
  placement: 'top',
}
