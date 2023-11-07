import { ReactNode } from 'react'
import IVButton from '~/components/IVButton'
import { trpc } from '~/utils/trpc'
import ConsoleIndex from '~/components/Console'
import GhostModeConsoleLayout from '../GhostModeConsoleLayout'

function NoticeView({
  body,
  button,
}: {
  body: ReactNode
  button: { label: string; href: string }
}) {
  return (
    <div className="bg-gray-100 p-4 rounded-md space-y-2  lg:flex lg:space-y-0 flex-row justify-between border border-gray-200">
      <div>
        <p>
          <b className="font-medium">
            Anyone with this URL can access and run these actions.
          </b>
        </p>
        <p>{body}</p>
      </div>
      <div className="flex items-center">
        <IVButton {...button} />
      </div>
    </div>
  )
}

function Notice() {
  // We don't use useMe because it's retry logic causes the notice not to display for a while...
  const { data, isFetched } = trpc.useQuery(['user.me'], {
    retry: false,
    keepPreviousData: true,
  })

  if (!isFetched) return null

  if (!data) {
    return (
      <NoticeView
        body={
          <>
            Sign up or login to customize your Interval URL and disable public
            access.
          </>
        }
        button={{
          label: 'Sign up or log in',
          href: '/login',
        }}
      />
    )
  }

  return (
    <NoticeView
      body={
        <>
          Start your Interval app with an API key from the dashboard to disable
          public access.
        </>
      }
      button={{
        label: 'Get an API Key',
        href: '/dashboard/develop/keys',
      }}
    />
  )
}

export default function GhostModeConsole({
  slugPrefix,
}: {
  slugPrefix?: string
}) {
  return (
    <GhostModeConsoleLayout>
      <div className="p-4 space-y-4">
        <Notice />
        <ConsoleIndex
          canRunActions={true}
          mode="anon-console"
          slugPrefix={slugPrefix}
        />
      </div>
    </GhostModeConsoleLayout>
  )
}
