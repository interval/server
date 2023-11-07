import { useCallback, useMemo } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { Form, Formik } from 'formik'
import { UserAccessPermission } from '@prisma/client'
import classNames from 'classnames'
import { trpc, inferQueryOutput } from '~/utils/trpc'
import IVButton from '~/components/IVButton'
import IVAvatar from '~/components/IVAvatar'
import { userAccessPermissionToString } from '~/utils/text'
import { notify } from '~/components/NotificationCenter'
import useDashboard, { useHasPermission } from '~/components/DashboardContext'
import { getPrimaryRole } from '~/utils/permissions'
import IconChevronDown from '~/icons/compiled/ChevronDown'
import IconChevronRight from '~/icons/compiled/ChevronRight'
import IVDialog, { useDialogState } from '~/components/IVDialog'
import PermissionSelector from '~/components/PermissionSelector'
import IVTooltip from '~/components/IVTooltip'
import KeysList from '~/components/KeysList'

export default function UsersList({
  data,
  onChange,
}: {
  data: inferQueryOutput<'dashboard.users.index'>
  onChange?: () => void
}) {
  const [searchParams] = useSearchParams()
  const location = useLocation()

  const { users, keys } = data ?? { users: [], keys: [] }
  const userKeyMap = useMemo(
    () =>
      keys.reduce((map, key) => {
        let arr = map.get(key.userId)
        if (!arr) {
          arr = []
          map.set(key.userId, arr)
        }
        arr.push(key)

        return map
      }, new Map()) ?? new Map(),
    [keys]
  )

  if (!data) return null

  const selectedUserId = searchParams.get('userId')

  return (
    <div>
      <div className="border-y border-gray-200 text-sm">
        <ul role="list" className="divide-y divide-gray-200">
          {users.map(access => (
            <li key={access.user.email}>
              <Link
                to={`${location.pathname}?userId=${
                  selectedUserId === access.user.id ? '' : access.user.id
                }`}
              >
                <div className="flex items-center px-4 py-4 hover:bg-gray-50">
                  <div className="min-w-0 flex-1 flex items-center">
                    <div className="flex-none h-12 w-12 flex items-center">
                      <IVAvatar
                        name={[access.user.firstName, access.user.lastName]
                          .filter(Boolean)
                          .join(' ')}
                      />
                    </div>
                    <div className="min-w-0 flex-1 px-3 md:grid md:grid-cols-2 md:gap-4">
                      <div>
                        <p className="font-medium text-primary-500 truncate">
                          {access.user.firstName} {access.user.lastName}
                        </p>
                        <span className="truncate text-gray-500">
                          {access.user.email}
                        </span>
                      </div>
                      <div className="hidden md:flex items-center">
                        <div>
                          {userAccessPermissionToString(
                            getPrimaryRole(access.permissions) ??
                              'ACTION_RUNNER'
                          )}
                          {access.user.emailConfirmToken?.email === null && (
                            <p>
                              <i>Awaiting email confirmation</i>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ml-5 flex-shrink-0">
                    {selectedUserId === access.user.id ? (
                      <IconChevronDown
                        className="h-4 w-4 text-gray-400"
                        aria-hidden="true"
                      />
                    ) : (
                      <IconChevronRight
                        className="h-4 w-4 text-gray-400"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </div>
              </Link>
              {selectedUserId === access.user.id && (
                <ExpandedUser
                  userAccess={access}
                  keys={userKeyMap.get(access.user.id) ?? []}
                  onChange={onChange}
                />
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

type UserAccess = inferQueryOutput<'dashboard.users.index'>['users'][0]

function getCurrentGroup(userAccess: UserAccess, groupId?: string) {
  if (!groupId) return null

  const group = userAccess.groupMemberships.find(
    gm => gm.group.id === groupId
  )?.group

  return group || null
}

function ExpandedUser({
  userAccess,
  keys,
  onChange,
}: {
  userAccess: UserAccess
  keys: inferQueryOutput<'dashboard.users.index'>['keys']
  onChange?: () => void
}) {
  const { groupId } = useParams<{ groupId: string | undefined }>()
  const { me, organization } = useDashboard()
  const editUserAccess = trpc.useMutation('organization.edit-user-access')
  const canWriteUsers = useHasPermission('WRITE_USERS')
  const canViewUserKeys = useHasPermission('READ_ORG_USER_API_KEY_EXISTENCE')
  const ctx = trpc.useContext()
  const removeUserDialog = useDialogState()
  const removeUserMutation = trpc.useMutation('organization.remove-user')
  const removeUserMembershipDialog = useDialogState()
  const removeUserMembershipMutation = trpc.useMutation('group.users.remove')

  const isUserExternallyManaged =
    userAccess.user.idpId && organization.sso?.workosOrganizationId

  // Don't allow editing your own or the owner's permissions
  const canEditPermissions =
    userAccess.user.id !== me.id && userAccess.user.id !== organization.ownerId

  const group = getCurrentGroup(userAccess, groupId)

  const canRemoveUserFromOrg = canWriteUsers && !isUserExternallyManaged
  const canRemoveUserFromGroup = canWriteUsers && !group?.scimGroupId

  const role = getPrimaryRole(userAccess.permissions) ?? 'ADMIN'

  const onRemoveUser = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      removeUserMutation.mutate(
        { id: userAccess.id },
        {
          onSuccess() {
            notify.success(
              `${userAccess.user.email} was removed from the organization.`
            )

            if (onChange) {
              onChange()
            }
          },
        }
      )
    },
    [onChange, removeUserMutation, userAccess]
  )

  const onRemoveUserMembership = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!groupId) return

      removeUserMembershipMutation.mutate(
        {
          groupId,
          userOrganizationAccessId: userAccess.id,
        },
        {
          onSuccess() {
            notify.success(
              `${userAccess.user.email} was removed from the team.`
            )

            if (onChange) {
              onChange()
            }
          },
        }
      )
    },
    [onChange, removeUserMembershipMutation, groupId, userAccess]
  )

  return (
    <div className="pb-4">
      {canWriteUsers && (
        <div className="p-4">
          <h3 className="h4 mb-2">Organization access</h3>
          <Formik<{ role: UserAccessPermission }>
            initialValues={{
              role,
            }}
            onSubmit={async ({ role }) => {
              if (!canEditPermissions || editUserAccess.isLoading) return

              editUserAccess.mutate(
                {
                  id: userAccess.id,
                  data: {
                    permissions: [role],
                  },
                },
                {
                  onSuccess() {
                    notify.success('User role has been updated.')

                    if (onChange) {
                      onChange()
                    }
                  },
                }
              )
            }}
          >
            <Form>
              <div className="mt-4 flex justify-start items-start">
                <PermissionSelector
                  name="role"
                  isUser={userAccess.user.id === me.id}
                  isOwner={userAccess.user.id === organization.ownerId}
                  disabled={editUserAccess.isLoading}
                />
                {canEditPermissions && (
                  <IVButton
                    theme="secondary"
                    className="mt-6 ml-2"
                    disabled={editUserAccess.isLoading}
                    type="submit"
                    label="Update role"
                  />
                )}
              </div>
            </Form>
          </Formik>
        </div>
      )}
      {keys.length > 0 && canViewUserKeys && (
        <div className="p-4">
          <h3 className="h4 mb-2">API Keys</h3>
          <KeysList
            keys={keys}
            onUpdate={() => ctx.refetchQueries(['dashboard.users.index'])}
          />
        </div>
      )}
      <div className="flex gap-4">
        {canRemoveUserFromOrg && (
          <IVTooltip
            placement="bottom-start"
            text={
              canEditPermissions
                ? undefined
                : 'You cannot remove yourself or the owner of the organization.'
            }
          >
            <IVButton
              theme="plain"
              className={classNames('text-red-600 hover:opacity-70', {
                'hover:opacity-70': canEditPermissions,
                'opacity-50': !canEditPermissions,
              })}
              onClick={removeUserDialog.show}
              disabled={!canEditPermissions}
              label="Remove from organization"
            />
          </IVTooltip>
        )}
        {canRemoveUserFromGroup && groupId && (
          <IVButton
            theme="plain"
            className={classNames('text-red-600', {
              'hover:opacity-70': canWriteUsers,
              'opacity-50': !canWriteUsers,
            })}
            onClick={removeUserMembershipDialog.show}
            disabled={!canWriteUsers}
            label="Remove from team"
          />
        )}
      </div>
      <IVDialog dialog={removeUserDialog} title="Remove from organization">
        <form onSubmit={onRemoveUser}>
          <div className="space-y-4 mb-6">
            <p>
              Are you sure you want to remove this user from the organization?
            </p>
            <p>All API keys belonging to this user will also be disabled.</p>
          </div>
          <div className="flex space-x-2">
            <IVButton
              theme="danger"
              label="Remove user"
              type="submit"
              autoFocus
              disabled={removeUserMutation.isLoading}
            />
            <IVButton
              theme="secondary"
              label="Cancel"
              type="button"
              onClick={removeUserDialog.hide}
              disabled={removeUserMutation.isLoading}
            />
          </div>
        </form>
      </IVDialog>
      <IVDialog dialog={removeUserMembershipDialog} title="Remove from team">
        <form onSubmit={onRemoveUserMembership}>
          <div className="space-y-4 mb-6">
            <p>Are you sure you want to remove this user from the team?</p>
          </div>
          <div className="flex space-x-2">
            <IVButton
              theme="danger"
              label="Remove user"
              type="submit"
              autoFocus
              disabled={removeUserMembershipMutation.isLoading}
            />
            <IVButton
              theme="secondary"
              label="Cancel"
              type="button"
              onClick={removeUserMembershipDialog.hide}
              disabled={removeUserMembershipMutation.isLoading}
            />
          </div>
        </form>
      </IVDialog>
    </div>
  )
}
