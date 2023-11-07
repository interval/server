import { CSSProperties, useMemo } from 'react'
import { getURLsFromString } from '~/utils/url'
import { Prisma } from '@prisma/client'
import { ActionMode } from '~/utils/types'
import classNames from 'classnames'
import ChronologicalScrollableFeed from '~/components/ChronologicalScrollableFeed'

export default function Logs(props: {
  logs: Prisma.JsonValue | string[]
  className?: string
  isCompleted: boolean
  isFocused?: boolean
  mode: ActionMode
  style?: CSSProperties
}) {
  const logs = useMemo((): string[] => {
    if (!Array.isArray(props.logs)) return []

    if (!props.logs || !props.logs.length) return []

    const lines = [...props.logs.map(String)]

    if (props.isCompleted) {
      lines.push('\n✔ Transaction completed')
    }

    return lines
  }, [props.logs, props.isCompleted])

  return (
    <ChronologicalScrollableFeed
      className={classNames('bg-gray-50', props.className)}
      style={props.style}
      contents={logs}
      isFocused={props.isFocused}
    >
      <div className="p-4">
        <div
          className="font-mono text-gray-500 text-sm whitespace-pre-wrap mb-3"
          style={{ wordBreak: 'break-word' }}
          data-pw-transaction-logs
        >
          {logs.length === 0 ? (
            props.mode === 'console' ? (
              <p className="opacity-70">
                No logs received yet. Use <code>ctx.log()</code> in your action
                to print output here.
              </p>
            ) : (
              <em className="opacity-50">No logs received yet</em>
            )
          ) : (
            <LogLines logs={logs} />
          )}
        </div>
      </div>
    </ChronologicalScrollableFeed>
  )
}

function LogLines({ logs }: { logs: string[] }) {
  return (
    <>
      {logs.map((line, i) => {
        const urlMatches = getURLsFromString(line)
        line = line.replace(/</, '&lt;').replace(/>/, '&gt;')

        if (urlMatches?.length) {
          let lineWithUrls = line

          for (let i = 0; i < urlMatches.length; i++) {
            const url = urlMatches[i]
            lineWithUrls = lineWithUrls.replace(
              url,
              `<a href="${
                url.startsWith('http') ? '' : '//'
              }${url}" target="_blank" class="underline decoration-slate-300 underline-offset-2 hover:text-gray-800">${url}</button>`
            )
          }

          return (
            <div key={i} dangerouslySetInnerHTML={{ __html: lineWithUrls }} />
          )
        }

        return <div key={i}>{line}</div>
      })}
    </>
  )
}
