import React from 'react'
import { StoryFn } from '@storybook/react'
import IVDialog, { IVDialogProps, useDialogState } from '.'
import IVButton from '~/components/IVButton'

/**
 * Dialogs are controlled by the `useDialogState` hook, so every story here
 * must use `DialogWrapper`.
 */
const IVDialogWrapper = (props: IVDialogProps) => {
  const dialog = useDialogState({
    visible: true,
  })

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <IVButton theme="primary" label="Open dialog" onClick={dialog.show} />
      <IVDialog {...props} dialog={dialog} />
    </div>
  )
}

export default {
  title: 'Components/IVDialog',
  component: IVDialog,
  args: {
    title: 'Default',
    children: (
      <p>
        This is the default Dialog component. It has a title, padding, and a
        close button in the upper right-hand corner.
      </p>
    ),
  },
}

const Template: StoryFn<IVDialogProps> = (args: IVDialogProps) => (
  <IVDialogWrapper {...args} />
)

export const Default = Template.bind({})
Default.args = {}

export const LongTitle = Template.bind({})
LongTitle.args = {
  title:
    "Are you sure you want to delete 'Team 2' (team_f6d8b6c46f4c4b3a9f6e7f9c9d3a3c3d)?",
}

export const TallDialog = Template.bind({})
TallDialog.args = {
  children: (
    <div className="flex flex-col justify-between" style={{ height: '800px' }}>
      <p>This is a dialog with a very tall body.</p>
      <p>This is the bottom of the dialog.</p>
    </div>
  ),
}

export const WithMarkdown = Template.bind({})
WithMarkdown.args = {
  title: 'Are you sure you want to delete Team 2?',
  children: `This is a _sensitive action_ that **cannot** be undone.\n\nID: \`team_f6d8b6c46f4c4b3a9f6e7f9c9d3a3jhsdjkfhskjc3d\``,
}
