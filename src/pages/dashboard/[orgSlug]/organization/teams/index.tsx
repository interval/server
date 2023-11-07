import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Field, Form, Formik, useFormikContext } from 'formik'
import { trpc, inferQueryOutput } from '~/utils/trpc'
import IVInputField from '~/components/IVInputField'
import IVButton from '~/components/IVButton'
import PageHeading from '~/components/PageHeading'
import { notify } from '~/components/NotificationCenter'
import { useHasPermission } from '~/components/DashboardContext'
import IconChevronRight from '~/icons/compiled/ChevronRight'
import { DialogStateReturn } from 'reakit'
import IVDialog, { useDialogState } from '~/components/IVDialog'
import EmptyState from '~/components/EmptyState'
import { pluralizeWithCount } from '~/utils/text'
import IVSpinner from '~/components/IVSpinner'
import { useOrgParams } from '~/utils/organization'
import IconClipboard from '~/icons/compiled/Clipboard'
import useCopyToClipboard from '~/utils/useCopyToClipboard'
import IVStatusPill from '~/components/IVStatusPill'

export default function GroupsPage() {
  const { orgSlug } = useOrgParams()
  const canAddUsers = useHasPermission('WRITE_USERS')
  const groups = trpc.useQuery(['group.list'])
  const addGroupDialog = useDialogState()

  return (
    <div className="dashboard-container space-y-6">
      <PageHeading
        title="Teams"
        actions={[
          {
            label: 'Create team',
            onClick: addGroupDialog.show,
            disabled: !canAddUsers,
          },
        ]}
      />
      <div className="-mx-4 sm:mx-0">
        {groups.data?.length ? (
          <GroupsList groups={groups.data} onChange={groups.refetch} />
        ) : groups.isLoading ? (
          <IVSpinner fullPage delayDuration={100} />
        ) : (
          <>
            <EmptyState
              title="You don't have any teams yet."
              actions={[
                {
                  label: 'Create team',
                  onClick: addGroupDialog.show,
                  disabled: !canAddUsers,
                },
                {
                  label: 'Manage users',
                  theme: 'secondary',
                  href: `/dashboard/${orgSlug}/organization/users`,
                  disabled: !canAddUsers,
                },
              ]}
            >
              <p>Use Teams to restrict action access to a group of users.</p>
            </EmptyState>
          </>
        )}
      </div>
      {canAddUsers && (
        <AddGroupDialog dialog={addGroupDialog} onSubmit={groups.refetch} />
      )}
    </div>
  )
}

function AddGroupDialog({
  onSubmit,
  dialog,
}: {
  onSubmit?: () => void
  dialog: DialogStateReturn
}) {
  const addGroup = trpc.useMutation('group.add')

  const { isSuccess } = addGroup
  const { hide } = dialog
  useEffect(() => {
    if (isSuccess) {
      hide()
      notify.success('Team created')
      if (onSubmit) {
        onSubmit()
      }
    }
  }, [isSuccess, onSubmit, hide])

  const isHidden = !dialog.visible && !dialog.animating

  const { reset: resetMutation } = addGroup
  useEffect(() => {
    if (isHidden) resetMutation()
  }, [isHidden, resetMutation])

  return (
    <IVDialog dialog={dialog} title="Create team">
      <Formik<{ name: string }>
        initialValues={{
          name: '',
        }}
        onSubmit={async ({ name }) => {
          if (addGroup.isLoading) return

          addGroup.mutate({
            data: {
              name,
            },
          })
        }}
      >
        <Form>
          <div className="space-y-4">
            <IVInputField id="name" label="Team name">
              <Field
                id="name"
                name="name"
                placeholder="Our new team"
                required
                className="form-input"
              />
            </IVInputField>
            {addGroup.isError && (
              <div className="px-4 py-3 text-sm font-medium text-red-800 rounded-md bg-red-50">
                Sorry, there was a problem creating the team.
              </div>
            )}
          </div>
          <div className="mt-6">
            <IVButton
              disabled={addGroup.isLoading}
              type="submit"
              label="Create team"
            />
          </div>
          <ResetFormToken isResetReady={isHidden} />
        </Form>
      </Formik>
    </IVDialog>
  )
}

function ResetFormToken({ isResetReady }: { isResetReady: boolean }) {
  const { resetForm } = useFormikContext()
  useEffect(() => {
    if (isResetReady) resetForm()
  }, [resetForm, isResetReady])

  return null
}

function GroupsList({
  groups,
}: {
  groups: inferQueryOutput<'group.list'>
  onChange?: () => void
}) {
  return (
    <div>
      <div className="border-y border-gray-200 text-sm">
        <ul role="list" className="divide-y divide-gray-200">
          {groups.map(group => (
            <GroupsListItem key={group.id} group={group} />
          ))}
        </ul>
      </div>
    </div>
  )
}

function GroupsListItem({
  group,
}: {
  group: inferQueryOutput<'group.list'>[0]
}) {
  const { onCopyClick: copySlug } = useCopyToClipboard({
    successMessage: 'Copied slug to clipboard',
  })

  return (
    <li>
      <Link to={group.id}>
        <div className="flex items-center px-4 py-4 hover:bg-gray-50">
          <div className="min-w-0 flex-1 flex items-center">
            <div className="min-w-0 flex-1 px-2 grid gap-2 md:grid-cols-3 md:gap-4 items-center">
              <div className="flex items-center justify-start space-x-2">
                <p className="font-medium text-primary-500 truncate">
                  {group.name}
                </p>
                {group.scimGroupId && <IVStatusPill label="SCIM" kind="info" />}
              </div>
              <div>
                <button
                  type="button"
                  onClick={event => {
                    event.preventDefault()
                    event.stopPropagation()
                    copySlug(group.slug ?? '')
                  }}
                  className="flex items-center justify-start space-x-2 hover:opacity-70"
                >
                  <span className="inline-block font-mono text-xs border border-gray-200 rounded-md px-2 py-1 bg-gray-50">
                    {group.slug}
                  </span>
                  <IconClipboard className="w-4 h-4 text-gray-500 ml-1" />
                </button>
              </div>
              <div className="hidden md:flex items-center">
                <div>
                  {pluralizeWithCount(group._count.memberships, 'member')}
                </div>
              </div>
            </div>
          </div>
          <div className="ml-5 flex-shrink-0">
            <IconChevronRight
              className="h-4 w-4 text-gray-400"
              aria-hidden="true"
            />
          </div>
        </div>
      </Link>
    </li>
  )
}
