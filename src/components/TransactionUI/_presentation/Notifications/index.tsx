import { useMemo } from 'react'
import classNames from 'classnames'
import { getURLsFromString } from '~/utils/url'
import { NotificationPayload } from '~/utils/transactions'
import ChronologicalScrollableFeed from '~/components/ChronologicalScrollableFeed'

export default function Notifications(props: {
  notifications: NotificationPayload[]
  className?: string
  style?: React.CSSProperties
  isCompleted: boolean
  isFocused?: boolean
}) {
  return (
    <ChronologicalScrollableFeed
      className={classNames('bg-gray-50', props.className)}
      style={props.style}
      contents={props.notifications}
      isFocused={props.isFocused}
    >
      <div className="p-4">
        <div
          className="font-mono text-gray-500 text-sm whitespace-pre-wrap mb-3"
          style={{ wordBreak: 'break-word' }}
          data-pw-transaction-logs
        >
          {props.notifications.length === 0 ? (
            <p className="opacity-70 mb-3">
              No notifications sent yet.{' '}
              <a
                target="_blank"
                className="underline decoration-slate-300 underline-offset-2 hover:text-gray-800"
                href="https://interval.com/docs/action-context/notify"
                rel="noreferrer"
              >
                Use <code>io.notify()</code> in your action to send
                notifications.
              </a>
            </p>
          ) : (
            <NotificationsLines notifications={props.notifications} />
          )}
          {props.isCompleted && <p className="mb-3">✔ Transaction completed</p>}
          <p className="opacity-70">
            Notifications are not delivered in development, but they appear here
            to preview behavior for live actions.
          </p>
        </div>
      </div>
    </ChronologicalScrollableFeed>
  )
}

function NotificationsLines({
  notifications,
}: {
  notifications: NotificationPayload[]
}) {
  const lines = useMemo(() => {
    const lines: React.ReactElement[] = []

    for (let i = 0; i < notifications.length; i++) {
      let message = notifications[i].message
      let title = notifications[i].title

      message = message.replace(/</, '&lt;').replace(/>/, '&gt;')
      title = title && title.replace(/</, '&lt;').replace(/>/, '&gt;')

      let line = title ? `<b>${title}:</b> ${message}` : message

      const urlMatches = getURLsFromString(line)

      if (urlMatches?.length) {
        for (let i = 0; i < urlMatches.length; i++) {
          const url = urlMatches[i]
          line = line.replace(
            url,
            `<a href="${
              url.startsWith('http') ? '' : '//'
            }${url}" target="_blank" class="underline decoration-slate-300 underline-offset-2 hover:text-gray-800">${url}</a>`
          )
        }
      }

      lines.push(
        <div key={i} className="mb-3">
          <p dangerouslySetInnerHTML={{ __html: line }} />
          <ul>
            {notifications[i].deliveries.map(d => (
              <li key={`${d.to}-${d.method}`}>
                <span className="opacity-70">Would have sent to </span>
                {d.to}
                {d.method && (
                  <>
                    <span className="opacity-70"> via </span>
                    {d.method}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )
    }

    return lines
  }, [notifications])

  return <>{lines.map(line => line)}</>
}
