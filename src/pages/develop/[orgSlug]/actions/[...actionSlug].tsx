import { useParams } from 'react-router-dom'
import { ConsoleAction } from '~/pages/dashboard/[orgSlug]/develop/actions/[...actionSlug]'
import GhostModeConsoleLayout from '../../GhostModeConsoleLayout'
import GhostModeConsole from '..'
import useDashboardStructure from '~/utils/useDashboardStructure'

function GhostModeActionConsoleInternal() {
  const params = useParams<{ '*': string }>()
  const actionSlug = params['*'] as string

  const { structure, actionExists } = useDashboardStructure({
    mode: 'console',
    actionSlug,
  })

  return actionExists || structure.isLoading ? (
    <GhostModeConsoleLayout>
      <div className="relative min-h-full">
        <ConsoleAction />
      </div>
    </GhostModeConsoleLayout>
  ) : (
    <GhostModeConsole slugPrefix={actionSlug} />
  )
}

export default function GhostModeActionConsole() {
  return (
    <GhostModeConsoleLayout>
      <GhostModeActionConsoleInternal />
    </GhostModeConsoleLayout>
  )
}
