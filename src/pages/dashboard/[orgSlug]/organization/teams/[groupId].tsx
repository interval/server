import { useCallback, useMemo, useEffect } from 'react'
import {
  useParams,
  useLocation,
  resolvePath,
  useNavigate,
  Link,
} from 'react-router-dom'
import { Field, Form, Formik, useFormikContext } from 'formik'
import { DialogStateReturn } from 'reakit'
import IVInputField from '~/components/IVInputField'
import AsyncIVSelect from '~/components/IVSelect/async'
import IVButton from '~/components/IVButton'
import {
  inferQueryOutput,
  inferMutationInput,
  inferMutationOutput,
  trpc,
  client,
} from '~/utils/trpc'
import { notify } from '~/components/NotificationCenter'
import IVDialog, { useDialogState } from '~/components/IVDialog'
import PageHeading from '~/components/PageHeading'
import UsersList from '~/components/UsersList'
import IVSpinner from '~/components/IVSpinner'
import NotFound from '~/components/NotFound'
import SectionHeading from '~/components/SectionHeading'
import { useHasPermission } from '~/components/DashboardContext'
import useCopyToClipboard from '~/utils/useCopyToClipboard'
import IconClipboard from '~/icons/compiled/Clipboard'
import IVAlert from '~/components/IVAlert'
import IconInfo from '~/icons/compiled/Info'
import IVStatusPill from '~/components/IVStatusPill'

function EditGroupDialog({
  dialog,
  group,
  onSubmit,
}: {
  dialog: DialogStateReturn
  group: inferQueryOutput<'group.one'>
  onSubmit?: (group: inferMutationOutput<'group.edit'>) => void
}) {
  const editGroup = trpc.useMutation('group.edit')

  return (
    <IVDialog dialog={dialog} title="Edit team">
      <Formik<inferMutationInput<'group.edit'>['data']>
        initialValues={{ name: group.name }}
        onSubmit={data => {
          editGroup.mutate(
            { id: group.id, data },
            {
              onSuccess: onSubmit,
            }
          )
        }}
      >
        {({ isValid }) => (
          <Form>
            <div className="space-y-4 mb-6">
              <IVInputField id="name" label="Name">
                <Field
                  name="name"
                  id="name"
                  className="form-input"
                  required
                  autoFocus
                  readOnly={editGroup.isLoading}
                />
              </IVInputField>
            </div>
            <div className="flex justify-between">
              <IVButton
                type="submit"
                label="Update team"
                disabled={!isValid}
                loading={editGroup.isLoading}
              />
            </div>
          </Form>
        )}
      </Formik>
    </IVDialog>
  )
}

function AddUserDialog({
  groupId,
  dialog,
  existingUsers,
  onSubmit,
}: {
  groupId: string
  dialog: DialogStateReturn
  existingUsers?: inferQueryOutput<'dashboard.users.index'>['users']
  onSubmit?: () => void
}) {
  const addUser = trpc.useMutation('group.users.add')

  const existingUserAccessIds: Set<string> | undefined = useMemo(() => {
    return new Set(existingUsers?.map(access => access.id))
  }, [existingUsers])

  const { isSuccess } = addUser
  const { hide } = dialog
  useEffect(() => {
    if (isSuccess) {
      hide()
      notify.success('Member was added to the organization.')
      if (onSubmit) {
        onSubmit()
      }
    }
  }, [isSuccess, onSubmit, hide])

  const isHidden = !dialog.visible && !dialog.animating

  const { reset: resetMutation } = addUser
  useEffect(() => {
    if (isHidden) resetMutation()
  }, [isHidden, resetMutation])

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      let accesses = await client.query('organization.users', {
        searchQuery,
        limit: 50,
      })

      if (existingUserAccessIds) {
        accesses = accesses.filter(
          access => !existingUserAccessIds.has(access.id)
        )
      }

      return accesses.map(({ id, user }) => {
        const name = [user.firstName, user.lastName].join(' ')
        return {
          value: id,
          label: name || user.email,
        }
      })
    },
    [existingUserAccessIds]
  )

  return (
    <IVDialog dialog={dialog} title="Add member">
      <Formik<{ userOrganizationAccessId: string }>
        initialValues={{
          userOrganizationAccessId: '',
        }}
        onSubmit={async ({ userOrganizationAccessId }) => {
          if (addUser.isLoading || !userOrganizationAccessId) return

          addUser.mutate({
            userOrganizationAccessId,
            groupId,
          })
        }}
        validate={({ userOrganizationAccessId }) => {
          if (!userOrganizationAccessId) {
            return {
              userOranizationAccessId: 'Please select a member.',
            }
          }
        }}
      >
        {({ setFieldValue, isValid }) => (
          <Form>
            <div className="space-y-4">
              <IVInputField id="userOrganizationAccessId" label="New member">
                <AsyncIVSelect
                  name="userOrganizationAccessId"
                  defaultLabel="Select a user"
                  onSearch={handleSearch}
                  noOptionsMessage="No users found not already a member"
                  defaultOptions
                  onChange={value => {
                    setFieldValue('userOrganizationAccessId', value)
                  }}
                />
              </IVInputField>
              {addUser.isError && (
                <p className="px-4 py-3 text-sm font-medium text-red-800 rounded-md bg-red-50">
                  Sorry, there was a problem adding the member to the group.
                </p>
              )}
            </div>
            <div className="mt-6 flex gap-2">
              <IVButton
                disabled={addUser.isLoading || !isValid}
                type="submit"
                label="Add member"
              />
            </div>
            <ResetFormToken isResetReady={isHidden} />
          </Form>
        )}
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

function DeleteGroupDialog({
  dialog,
  group,
  onSubmit,
}: {
  dialog: DialogStateReturn
  group: inferQueryOutput<'group.one'>
  onSubmit: () => void
}) {
  const deleteGroup = trpc.useMutation('group.delete')
  const { orgSlug } = useParams<{ orgSlug: string }>()

  return (
    <IVDialog dialog={dialog} title="Delete team">
      <p className="mb-2">
        Are you sure you want to delete this team? This cannot be undone.
      </p>
      {group.actionAccesses.length > 0 && (
        <>
          <p className="mb-2">
            The following actions have permissions configured for this team:
          </p>
          <ul className="ml-4">
            {group.actionAccesses.map(actionAccess => (
              <li key={actionAccess.actionMetadata.id} className="list-disc">
                <a
                  className="text-primary-500 font-medium hover:opacity-60"
                  href={`/dashboard/${orgSlug}/configure/${actionAccess.actionMetadata.action.slug}?tab=permissions`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {actionAccess.actionMetadata.action.slug}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="mt-6 flex gap-2">
        <IVButton
          disabled={deleteGroup.isLoading}
          type="submit"
          theme="danger"
          label="Delete team"
          onClick={() => {
            deleteGroup.mutate(
              { id: group.id },
              {
                onSuccess: onSubmit,
              }
            )
          }}
        />
        <IVButton
          disabled={deleteGroup.isLoading}
          theme="secondary"
          label="Cancel"
          onClick={dialog.hide}
        />
      </div>
    </IVDialog>
  )
}

export default function GroupPage() {
  const canAddUsers = useHasPermission('WRITE_USERS')
  const canReadUsers = useHasPermission('READ_USERS')
  const navigate = useNavigate()
  const location = useLocation()
  const { groupId: id } = useParams<{ groupId: string }>()
  const groupId = id as string

  const group = trpc.useQuery(['group.one', { id: groupId }], {
    retry(retryCount, error) {
      if (error.data?.code === 'NOT_FOUND') return false
      return retryCount < 3
    },
  })
  const users = trpc.useQuery(['dashboard.users.index', { groupId }])

  const addUserDialog = useDialogState()
  const editGroupDialog = useDialogState()
  const deleteGroupDialog = useDialogState()

  const { onCopyClick: copySlug } = useCopyToClipboard({
    successMessage: 'Copied slug to clipboard',
  })

  if (group.isLoading) {
    return <IVSpinner fullPage delayDuration={100} />
  }

  if (!group.data) {
    return <NotFound />
  }

  const isScimGroup = !!group.data.scimGroupId

  return (
    <div className="dashboard-container">
      <div className="mb-2 -mt-2">
        <Link
          to={resolvePath('../', location.pathname)}
          className="font-medium text-primary-500 inline-block hover:opacity-70 text-sm"
        >
          &lsaquo; Teams
        </Link>
      </div>
      <PageHeading
        title={
          <span className="flex items-center justify-start space-x-2">
            <span>{group.data?.name ?? 'Team'}</span>
            {group.data?.name.startsWith('Dep:') && (
              <IVStatusPill label="SCIM" kind="info" />
            )}
          </span>
        }
        actions={
          !isScimGroup
            ? [
                {
                  label: 'Edit',
                  onClick: editGroupDialog.show,
                  theme: 'secondary',
                  disabled: !canAddUsers,
                },
                {
                  label: 'Add member',
                  theme: 'primary',
                  onClick: addUserDialog.show,
                  disabled: !canAddUsers,
                },
              ]
            : []
        }
      />
      <div className="space-y-10 mt-6">
        <section>
          <label className="form-label">Slug</label>
          <div className="mb-2">
            <button
              type="button"
              onClick={() => copySlug(group.data?.slug ?? '')}
              className="flex items-center justify-start space-x-2 hover:opacity-70"
            >
              <span className="inline-block font-mono text-sm border border-gray-200 rounded-md px-2 py-1 bg-gray-50">
                {group.data?.slug}
              </span>
              <IconClipboard className="w-4 h-4 text-gray-500 ml-1" />
            </button>
          </div>
          <p className="text-sm text-gray-500">
            Use this slug when assigning permissions to teams{' '}
            <a
              href="https://interval.com/docs/writing-actions/authentication"
              className="font-medium text-primary-500 hover:opacity-70"
            >
              via code
            </a>
            .
          </p>
        </section>
        {canReadUsers && (
          <section>
            <div className="mb-4">
              <SectionHeading title="Members" />
            </div>
            {isScimGroup && (
              <IVAlert
                theme="info"
                icon={IconInfo}
                dismissible={false}
                className="my-4"
              >
                <p>
                  This team is managed by an external identity provider. You can
                  manage this team and its members in your identity provider.
                </p>
              </IVAlert>
            )}
            {users.data?.users.length ? (
              <UsersList data={users.data} onChange={users.refetch} />
            ) : (
              <p className="text-sm">This team does not have any members.</p>
            )}
          </section>
        )}
        {canAddUsers && !isScimGroup && (
          <section>
            <button
              type="button"
              onClick={deleteGroupDialog.show}
              children="Delete team"
              className="text-red-500 hover:opacity-70 text-sm"
            />
          </section>
        )}
      </div>

      <AddUserDialog
        dialog={addUserDialog}
        groupId={groupId}
        onSubmit={users.refetch}
        existingUsers={users.data?.users}
      />
      <EditGroupDialog
        dialog={editGroupDialog}
        group={group.data}
        onSubmit={() => {
          editGroupDialog.hide()
          notify.success('Team updated.')
          group.refetch()
        }}
      />
      <DeleteGroupDialog
        dialog={deleteGroupDialog}
        group={group.data}
        onSubmit={() => {
          notify.success('Team deleted')
          navigate(resolvePath('..', location.pathname).pathname)
        }}
      />
    </div>
  )
}
