import { useEffect, useMemo } from 'react'
import { Field, Form, Formik, useFormikContext } from 'formik'
import { UserAccessGroup, UserAccessPermission } from '@prisma/client'
import { trpc, inferQueryOutput, inferMutationInput } from '~/utils/trpc'
import IVInputField from '~/components/IVInputField'
import IVButton from '~/components/IVButton'
import PageHeading from '~/components/PageHeading'
import { notify } from '~/components/NotificationCenter'
import { useHasPermission } from '~/components/DashboardContext'
import { DialogStateReturn } from 'reakit'
import IVDialog, { useDialogState } from '~/components/IVDialog'
import PermissionSelector from '~/components/PermissionSelector'
import SimpleTable from '~/components/SimpleTable'
import { dateTimeFormatter } from '~/utils/formatters'
import IVAPIError from '~/components/IVAPIError'
import UsersList from '~/components/UsersList'
import useTable from '~/components/IVTable/useTable'
import { useOrgParams } from '~/utils/organization'
import IVAlert from '~/components/IVAlert'
import IconInfo from '~/icons/compiled/Info'
import TeamsSelectorProps from '~/components/TeamsSelector'

export default function UsersPage() {
  useHasPermission('READ_USERS', { redirectToDashboardHome: true })
  const canAddUsers = useHasPermission('WRITE_USERS')
  const { envSlug } = useOrgParams()

  const addUserDialog = useDialogState()

  const users = trpc.useQuery(['dashboard.users.index'])
  const teams = trpc.useQuery(['group.list'])

  return (
    <div className="dashboard-container space-y-4">
      <PageHeading
        title="Users"
        actions={[
          {
            label: 'Add user',
            onClick: () => addUserDialog.show(),
            disabled: !canAddUsers,
          },
        ]}
      />
      {envSlug && (
        <IVAlert theme="info" icon={IconInfo} className="mb-4">
          <p>Users persist across all environments.</p>
        </IVAlert>
      )}
      {users.data && (
        <>
          <div className="-mx-4 sm:mx-0">
            <UsersList data={users.data} onChange={users.refetch} />
          </div>
          <div className="pt-6">
            <PendingInvitationsTable
              pendingInvitations={users.data.pendingInvitations}
            />
          </div>
        </>
      )}
      {canAddUsers && (
        <AddUserDialog
          dialog={addUserDialog}
          onSubmit={users.refetch}
          teams={teams.data ?? []}
        />
      )}
    </div>
  )
}

interface AddUserFormState
  extends Omit<inferMutationInput<'organization.add-user'>, 'permissions'> {
  role: UserAccessPermission
}

function AddUserDialog({
  onSubmit,
  dialog,
  teams,
}: {
  onSubmit?: () => void
  dialog: DialogStateReturn
  teams: Pick<UserAccessGroup, 'id' | 'name'>[]
}) {
  const addUser = trpc.useMutation('organization.add-user')

  const isHidden = !dialog.visible && !dialog.animating

  const { reset: resetMutation } = addUser
  useEffect(() => {
    if (isHidden) resetMutation()
  }, [isHidden, resetMutation])

  return (
    <IVDialog dialog={dialog} title="Add user">
      <Formik<AddUserFormState>
        initialValues={{
          email: '',
          role: 'ACTION_RUNNER',
          groupIds: [],
        }}
        onSubmit={async ({ email, role, groupIds }) => {
          if (addUser.isLoading) return

          addUser.mutate(
            {
              email,
              permissions: [role],
              groupIds,
            },
            {
              async onSuccess() {
                dialog.hide()
                if (onSubmit) onSubmit()
                notify.success(`An invitation was sent to ${email}.`)
              },
            }
          )
        }}
      >
        <Form>
          <div className="space-y-4">
            <IVInputField id="email" label="Email address">
              <Field
                // *-search prevents safari et al from suggesting your own contact info
                id="email-search"
                name="email"
                type="email"
                placeholder="name@example.com"
                autoComplete="off"
                autoFocus
                required
                className="form-input"
              />
            </IVInputField>
            <PermissionSelector name="role" />
            <TeamsSelectorProps
              label="Add to teams"
              name="groupIds"
              teams={teams}
            />
            <IVAPIError error={addUser.error} />
          </div>
          {addUser.error?.message !== 'NOT_FOUND' && (
            <div className="mt-6">
              <IVButton
                disabled={addUser.isLoading}
                type="submit"
                label="Add user"
              />
            </div>
          )}
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

function PendingInvitationsTable({
  pendingInvitations,
}: {
  pendingInvitations: inferQueryOutput<'dashboard.users.index'>['pendingInvitations']
}) {
  const { mutate } = trpc.useMutation('organization.revoke-invitation')
  const { refetchQueries } = trpc.useContext()

  const rows = useMemo(() => {
    return pendingInvitations.map((invitation, idx) => {
      return {
        key: invitation.id,
        data: {
          email: invitation.email,
          sentAt: dateTimeFormatter.format(invitation.createdAt),
          action: (
            <button
              key={invitation.id}
              className="text-red-600 hover:opacity-60"
              onClick={() => {
                if (
                  confirm('Are you sure you want to revoke this invitation?')
                ) {
                  mutate(
                    { id: invitation.id },
                    {
                      async onSuccess() {
                        notify.success('Invitation revoked.')
                        refetchQueries(['dashboard.users.index'])
                      },
                    }
                  )
                }
              }}
            >
              Revoke
            </button>
          ),
        },
      }
    })
  }, [pendingInvitations, mutate, refetchQueries])

  const table = useTable({
    data: rows,
    columns: ['Email', 'Sent at', ''],
    // sorting tables w/ react components still needs some work; disable sorting until that works
    isSortable: false,
    shouldCacheRecords: false,
  })

  if (!rows.length) return null

  return (
    <div>
      <h3 className="h4 mb-2">Pending invitations</h3>
      <SimpleTable table={table} />
    </div>
  )
}
