import classNames from 'classnames'
import IVSpinner from '~/components/IVSpinner'
import { RCTResponderProps } from '~/components/RenderIOCall'
import CheckIcon from '~/icons/compiled/Check'
import SubtractIcon from '~/icons/compiled/Subtract'

type Status = 'complete' | 'in-progress' | 'pending'

function StatusCircle({ state }: { state: Status }) {
  console.log('state', state)
  const Icon = state === 'complete' ? CheckIcon : SubtractIcon
  return (
    <span
      className={classNames(
        state === 'complete' ? 'bg-green-600' : 'bg-gray-400',
        'h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white'
      )}
    >
      {state === 'in-progress' ? (
        <IVSpinner className="text-white p-1 w-6 h-6" />
      ) : (
        <Icon
          className="h-4 w-4 text-white"
          strokeWidth={3}
          aria-hidden="true"
        />
      )}
    </span>
  )
}

function computeStatus(
  itemIndex: number,
  lastCompleteIndex: number,
  isComplete: boolean
): Status {
  if (isComplete) return 'complete'
  if (lastCompleteIndex + 1 === itemIndex) return 'in-progress'
  return 'pending'
}

export default function ListProgress(
  props: RCTResponderProps<'DISPLAY_PROGRESS_THROUGH_LIST'>
) {
  let lastCompleted = -1
  props.items.forEach((item, idx) => {
    if (item.isComplete) {
      lastCompleted = idx
    }
  })

  console.log('lci', lastCompleted)
  return (
    <>
      <h2 className="h3 text-gray-900 mb-4">{props.label}</h2>
      <div className="flow-root">
        <ul role="list" className="-mb-8">
          {props.items.map((item, eventIdx) => (
            <li key={item.label}>
              <div className="relative pb-8">
                {eventIdx !== props.items.length - 1 ? (
                  <span
                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                ) : null}
                <div className="relative flex space-x-3">
                  <div>
                    <StatusCircle
                      state={computeStatus(
                        eventIdx,
                        lastCompleted,
                        item.isComplete
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                    <div>
                      <p className="text-sm text-gray-500">
                        {item.label}
                        {item.resultDescription && (
                          <span className="text-gray-300"> – </span>
                        )}
                        <span className="font-medium text-gray-900">
                          {item.resultDescription}
                        </span>
                      </p>
                    </div>
                    {/* <div className="text-right text-sm whitespace-nowrap text-gray-500">
                      <time dateTime={event.datetime}>{event.date}</time>
                    </div> */}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
