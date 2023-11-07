import { useMemo } from 'react'
import { Prisma } from '@prisma/client'
import { trpc } from '~/utils/trpc'
import { notify } from '~/components/NotificationCenter'
import { useHasPermission } from '~/components/DashboardContext'
import { dateFormatter } from '~/utils/formatters'
import SimpleTable from '~/components/SimpleTable'
import useTable, { IVTableRow } from '~/components/IVTable/useTable'

export default function KeysList({
  keys,
  onUpdate,
}: {
  keys: Pick<
    Prisma.ApiKeyGetPayload<{
      include: {
        hostInstances: { select: { createdAt: true } }
        organizationEnvironment: true
      }
    }>,
    | 'id'
    | 'label'
    | 'createdAt'
    | 'usageEnvironment'
    | 'organizationEnvironment'
    | 'hostInstances'
    | 'deletedAt'
  >[]
  onUpdate?: () => void
}) {
  const { mutate: deleteKey } = trpc.useMutation('key.delete')
  const canDeleteKeys = useHasPermission('DELETE_ORG_USER_API_KEYS')

  const data = useMemo<IVTableRow[]>(() => {
    return keys.map((key, idx) => ({
      key: String(idx),
      data: {
        label:
          key.label ??
          (key.usageEnvironment === 'DEVELOPMENT'
            ? 'Personal development key'
            : '(Unnamed)'),
        environment: key.organizationEnvironment?.name ?? 'Production',
        createdAt: key.createdAt && dateFormatter.format(key.createdAt),
        lastUsed:
          key.hostInstances.length > 0 ? (
            <time dateTime={key.hostInstances[0].createdAt.toISOString()}>
              {dateFormatter.format(key.hostInstances[0].createdAt)}
            </time>
          ) : (
            <span>never</span>
          ),
        actions: key.deletedAt ? (
          <span className="text-gray-400 block text-right">Deleted</span>
        ) : canDeleteKeys ? (
          <div className="text-right">
            <button
              key="delete"
              className="text-red-600 hover:opacity-60"
              onClick={() => {
                if (
                  window.confirm('Are you sure you want to delete this key?')
                ) {
                  deleteKey(
                    { id: key.id },
                    {
                      onSuccess() {
                        notify.success(`Key '${key.label}' was deleted.`)
                        if (onUpdate) onUpdate()
                      },
                    }
                  )
                }
              }}
            >
              Delete
            </button>
          </div>
        ) : null,
      },
    }))
  }, [canDeleteKeys, deleteKey, keys, onUpdate])

  const table = useTable({
    data,
    columns: ['Label', 'Environment', 'Created', 'Last used', ''],
    // sorting tables w/ react components still needs some work; disable sorting until that works
    isSortable: false,
    shouldCacheRecords: false,
  })

  return <SimpleTable table={table} />
}
