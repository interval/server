import { Field, Form, Formik } from 'formik'
import { trpc, inferMutationInput, QueryError } from '~/utils/trpc'
import useDashboard, { useHasPermission } from '~/components/DashboardContext'
import { useCallback, useEffect, useMemo, useState } from 'react'
import useTable from '~/components/IVTable/useTable'
import IVInputField from '~/components/IVInputField'
import IVButton from '~/components/IVButton'
import PageHeading from '~/components/PageHeading'
import { notify } from '~/components/NotificationCenter'
import Dialog, { useDialogState } from '~/components/IVDialog'
import { OrganizationEnvironment } from '@prisma/client'
import IVTooltip from '~/components/IVTooltip'
import { useOrgParams } from '~/utils/organization'
import { useNavigate } from 'react-router-dom'
import {
  DEVELOPMENT_ORG_ENV_NAME,
  DEVELOPMENT_ORG_ENV_SLUG,
  legacy_switchToEnvironment,
  PRODUCTION_ORG_ENV_NAME,
  PRODUCTION_ORG_ENV_SLUG,
} from '~/utils/environments'
import { focusManager } from 'react-query'
import SimpleTable from '~/components/SimpleTable'
import classNames from 'classnames'
import { ENV_COLOR_OPTIONS } from '~/utils/color'
import EnvironmentColor from '~/components/EnvironmentColor'

type EnvironmentsListItem = Omit<OrganizationEnvironment, 'organizationId'> & {
  isLocked: boolean
}

function EnvFields({
  mode,
  isLoading,
  error,
  isLocked,
}: {
  mode: 'create' | 'update'
  isLoading: boolean
  error: QueryError | null
  isLocked: boolean
}) {
  return (
    <Form>
      <div>
        <div className="space-y-4">
          <IVInputField
            id="name"
            label="Environment name"
            helpText={
              isLocked
                ? "The name of this environment can't be changed."
                : undefined
            }
          >
            <Field
              id="name"
              name="name"
              type="text"
              className="form-input"
              placeholder="Staging"
              disabled={isLoading}
              readOnly={isLocked}
              validate={(val: string) => {
                if (!val) return 'Please enter a name.'
              }}
              required
              autoFocus={!isLocked}
            />
          </IVInputField>
          <IVInputField id="color" label="Color">
            <div className="flex space-x-1 pt-1 pb-3">
              {Object.keys(ENV_COLOR_OPTIONS).map(color => (
                <label
                  key={color}
                  className="flex items-center relative cursor-pointer p-1"
                >
                  <Field
                    type="radio"
                    name="color"
                    value={color}
                    className="invisible absolute top-0 left-0 peer"
                  />
                  <EnvironmentColor color={color} size="md" selected />
                </label>
              ))}
            </div>
          </IVInputField>
        </div>
        {error && (
          <div className="text-red-600 mt-2">
            {error.message ?? (
              <>
                Sorry, there was a problem{' '}
                {mode === 'create' ? 'creating' : 'updating'} the environment.
              </>
            )}
          </div>
        )}
        <IVButton
          disabled={isLoading}
          type="submit"
          label={mode === 'create' ? 'Create environment' : 'Save changes'}
          className="mt-6"
        />
      </div>
    </Form>
  )
}

function CreateEnvForm(props: { onSuccess: () => void }) {
  const createEnv = trpc.useMutation('environments.create')

  return (
    <Formik<inferMutationInput<'environments.create'>>
      initialValues={{
        name: '',
        color: 'none',
      }}
      onSubmit={async ({ name, color }, { resetForm }) => {
        if (createEnv.isLoading) return

        createEnv.mutate(
          { name, color },
          {
            onSuccess() {
              resetForm()
              notify.success(`Environment '${name}' was created.`)
              props.onSuccess()
            },
          }
        )
      }}
    >
      <EnvFields
        mode="create"
        isLoading={createEnv.isLoading}
        error={createEnv.error}
        isLocked={false}
      />
    </Formik>
  )
}

function UpdateEnvForm(props: {
  env: EnvironmentsListItem
  onSuccess: () => void
}) {
  const updateEnv = trpc.useMutation('environments.update')
  const { orgSlug, envSlug } = useOrgParams()
  const navigate = useNavigate()

  return (
    <Formik<inferMutationInput<'environments.update'>>
      initialValues={{
        id: props.env.id,
        name: props.env.name,
        color: props.env.color || 'none',
      }}
      onSubmit={async ({ id, name, color }) => {
        if (updateEnv.isLoading) return

        updateEnv.mutate(
          { id, name, color },
          {
            onSuccess(res) {
              // replace active envSlug if changed
              if (envSlug && res.slug !== envSlug) {
                navigate(
                  `/dashboard/${orgSlug}+${res.slug}/organization/environments`,
                  { replace: true }
                )
              }

              notify.success(`Environment '${name}' was updated.`)
              props.onSuccess()
            },
          }
        )
      }}
    >
      <EnvFields
        mode="update"
        error={updateEnv.error}
        isLoading={updateEnv.isLoading}
        isLocked={
          props.env.name === DEVELOPMENT_ORG_ENV_NAME ||
          props.env.name === PRODUCTION_ORG_ENV_NAME
        }
      />
    </Formik>
  )
}

function EnvrionmentsList({
  environments,
  onUpdate,
  onEdit,
}: {
  environments: EnvironmentsListItem[]
  onUpdate: () => void
  onEdit: (env: EnvironmentsListItem) => void
}) {
  const { envSlug, orgEnvSlug, orgSlug } = useOrgParams()
  const { mutate: deleteEnv } = trpc.useMutation('environments.delete')

  const data = useMemo(() => {
    const onDeleteEnv = (env: EnvironmentsListItem) => {
      // prevent refetch after confirm dialog is closed
      focusManager.setFocused(false)
      if (window.confirm('Are you sure you want to delete this environment?')) {
        deleteEnv(
          { id: env.id },
          {
            onSuccess() {
              notify.success(`Environment '${env.name}' was deleted.`)
              if (onUpdate) onUpdate()
              if (env.slug === envSlug) {
                legacy_switchToEnvironment(orgEnvSlug, orgSlug)
              }
            },
            onSettled() {
              focusManager.setFocused(undefined)
            },
          }
        )
      } else {
        focusManager.setFocused(undefined)
      }
    }

    return environments.map(env => ({
      key: env.name,
      data: {
        label: (
          <span className="flex items-center gap-2">
            <EnvironmentColor color={env.color} size="sm" />
            {env.name}
          </span>
        ),
        slug: (
          <span className="flex items-center gap-2 font-mono">{env.slug}</span>
        ),
        actions: env.deletedAt ? (
          <span className="text-gray-400">Deleted</span>
        ) : (
          <div className="text-right space-x-4">
            <button
              type="button"
              className="text-gray-500 hover:opacity-60 disabled:opacity-40 disabled:pointer-events-none"
              onClick={() => onEdit(env)}
            >
              Edit
            </button>
            <IVTooltip
              placement="left"
              text={env.isLocked ? "This environment can't be modified." : ''}
            >
              <button
                type="button"
                className={classNames(
                  'hover:opacity-60 disabled:opacity-40 disabled:pointer-events-none',
                  {
                    'text-red-600': !env.isLocked,
                  }
                )}
                disabled={env.isLocked}
                onClick={() => onDeleteEnv(env)}
              >
                Delete
              </button>
            </IVTooltip>
          </div>
        ),
      },
    }))
  }, [environments, deleteEnv, onUpdate, envSlug, orgEnvSlug, orgSlug, onEdit])

  const table = useTable({
    data,
    columns: ['Name', 'Slug', ''],
    isSortable: false,
    shouldCacheRecords: false,
  })

  return <SimpleTable table={table} />
}

export default function NewEnvironmentPage() {
  const createEditEnvDialog = useDialogState()
  const { organization, refetchOrg } = useDashboard()
  const { refetchQueries } = trpc.useContext()
  useHasPermission('WRITE_ORG_SETTINGS', { redirectToDashboardHome: true })
  const [editingEnv, setEditingEnv] = useState<EnvironmentsListItem | null>(
    null
  )

  const onCreateEditSuccess = useCallback(() => {
    refetchOrg()
    refetchQueries(['environments.single'])
    createEditEnvDialog.hide()
  }, [refetchOrg, createEditEnvDialog, refetchQueries])

  const onEdit = useCallback(
    (env: EnvironmentsListItem) => {
      setEditingEnv(env)
      createEditEnvDialog.show()
    },
    [createEditEnvDialog]
  )

  useEffect(() => {
    if (!createEditEnvDialog.visible && !createEditEnvDialog.animating) {
      setEditingEnv(null)
    }
  }, [createEditEnvDialog.visible, createEditEnvDialog.animating])

  const { environments } = organization
  const allEnvironments = useMemo(() => {
    const allEnvironments: EnvironmentsListItem[] = [
      ...environments.map(env => ({
        ...env,
        isLocked:
          env.slug === 'production' ||
          env.slug === null ||
          env.slug === DEVELOPMENT_ORG_ENV_SLUG,
      })),
    ]

    if (!allEnvironments.find(env => env.slug === PRODUCTION_ORG_ENV_SLUG)) {
      // Show a dummy production environment if the user hasn't created an environments yet.
      // This will be replaced by a real prod environment when they create their first env.
      allEnvironments.push({
        id: PRODUCTION_ORG_ENV_NAME.toLowerCase(),
        name: PRODUCTION_ORG_ENV_NAME,
        slug: PRODUCTION_ORG_ENV_SLUG,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        isLocked: true,
        color: null,
      })
    }

    if (!allEnvironments.find(env => env.slug === DEVELOPMENT_ORG_ENV_SLUG)) {
      // Show a dummy development environment if the user hasn't created an environments yet.
      // This will be replaced by a real prod environment when they create their first env.
      allEnvironments.push({
        id: DEVELOPMENT_ORG_ENV_SLUG,
        name: DEVELOPMENT_ORG_ENV_NAME,
        slug: DEVELOPMENT_ORG_ENV_SLUG,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        isLocked: true,
        color: null,
      })
    }

    // Make sure production and development are first and second
    allEnvironments.sort((a, b) => {
      if (a.name === PRODUCTION_ORG_ENV_NAME) return -1
      if (b.name === PRODUCTION_ORG_ENV_NAME) return 1

      if (a.name === DEVELOPMENT_ORG_ENV_NAME) return -1
      if (b.name === DEVELOPMENT_ORG_ENV_NAME) return 1
      return 0
    })

    return allEnvironments
  }, [environments])

  return (
    <div className="dashboard-container space-y-4">
      <PageHeading
        title="Environments"
        actions={[
          {
            theme: 'primary',
            label: 'Create environment',
            onClick: createEditEnvDialog.show,
          },
        ]}
      />

      <div className="mb-8 mt-6">
        <EnvrionmentsList
          onUpdate={refetchOrg}
          onEdit={onEdit}
          environments={allEnvironments}
        />
      </div>

      <Dialog
        dialog={createEditEnvDialog}
        title={editingEnv ? 'Edit environment' : 'Create environment'}
      >
        {editingEnv ? (
          <UpdateEnvForm onSuccess={onCreateEditSuccess} env={editingEnv} />
        ) : (
          <CreateEnvForm onSuccess={onCreateEditSuccess} />
        )}
      </Dialog>
    </div>
  )
}
