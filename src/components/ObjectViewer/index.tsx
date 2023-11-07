import { useState } from 'react'
import classNames from 'classnames'
import { dateTimeFormatter } from '~/utils/formatters'

// Pseudo element contents are defined in CSS because Tailwind arbitrary values
// don't seem to support square brackets, and have poor performance in this case
import './object-viewer.css'

function ValueRenderer({ data }: { data: any }) {
  if (data instanceof Date) {
    return (
      <span className="text-[#4390AB]">{dateTimeFormatter.format(data)}</span>
    )
  }
  if (typeof data === 'bigint') {
    return <span className="text-[#4390AB]">{`${data.toString()}n`}</span>
  }
  if (data === null) {
    return <span className="text-gray-400">null</span>
  }
  if (data === true || data === false || typeof data === 'number') {
    return <span className="text-[#4390AB]">{JSON.stringify(data)}</span>
  }
  return <span className="text-[#799F45]">{JSON.stringify(data)}</span>
}

export default function ObjectViewer({
  data,
  name,
  expanded = true,
  collapsible = false,
}: {
  data: any
  name?: string
  expanded?: boolean
  collapsible?: boolean
}) {
  const [isOpen, setIsOpen] = useState(expanded)

  const isExpandable =
    !!data && typeof data === 'object' && !(data instanceof Date)

  if (data instanceof Map) {
    const newData: { [key: string]: any } = {}
    for (const [key, val] of data.entries()) {
      newData[key] = val
    }
    data = newData
  }

  if (data instanceof Set) {
    data = [...data]
  }

  if (!isExpandable) {
    return (
      <div className="flex gap-2 font-mono">
        <dt
          className={classNames('opacity-75', {
            'sr-only': !name,
            'after:content-[":"]': name,
          })}
        >
          {name ?? 'Value'}
        </dt>
        <dd>
          <ValueRenderer data={data} />
        </dd>
      </div>
    )
  }

  return (
    <details
      open={isOpen || !collapsible}
      onToggle={event => {
        if (!collapsible) {
          setIsOpen(true)
          return
        }

        event.stopPropagation()
        const target = event.target as HTMLDetailsElement
        setIsOpen(target.open)
      }}
      className={classNames(
        'iv-object-viewer flex flex-col items-start after:ml-3 font-mono text-sm',
        {
          'is-open': isOpen,
          'is-array': Array.isArray(data),
          'is-collapsible -ml-6 pl-px': collapsible,
        }
      )}
    >
      <summary
        className={classNames('px-2 cursor-pointer hover:bg-slate-100', {
          'inline-block pointer-events-none': !collapsible,
        })}
      >
        {name && <span className="opacity-75 mr-2">{name}</span>}
      </summary>

      <div className="ml-3 pl-6 border-l border-gray-200 hover:border-gray-300">
        {Object.entries(data).map(([name, data]) => (
          <ObjectViewer
            key={name}
            name={name}
            data={data}
            expanded={!!data && Object.getOwnPropertyNames(data).length < 5}
            collapsible
          />
        ))}
      </div>
    </details>
  )
}
