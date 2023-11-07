import { ZodError } from 'zod'
import { pluralize } from '~/utils/text'
import { IORenderInstruction } from '~/components/RenderIOCall'

export default function ComponentError({
  component,
  error,
}: {
  component?: IORenderInstruction
  error: Pick<ZodError, 'issues'>
}) {
  return (
    <div className="bg-red-50 rounded-md p-4 text-red-800 text-sm">
      {component && (
        <label className="form-label mb-3 text-red-800">
          Label: {component.label ?? <em>No label</em>}
        </label>
      )}
      <p>
        This {component ? 'field' : 'action'} contains the following{' '}
        {pluralize(error.issues.length, 'error')}:
      </p>
      <ul className="list-outside ml-4 my-2">
        {error.issues.map((err, idx) => (
          <li key={idx}>
            <span className="font-mono">{pathToString(err.path)}:</span>{' '}
            {err.message}
          </li>
        ))}
      </ul>
      <p>Please correct your action code and try again.</p>
    </div>
  )
}

function pathToString(path: (string | number)[]) {
  if (path.length === 0) return ''

  return (
    path[0] +
    path
      .slice(1)
      .map(p => `[${p}]`)
      .join('')
  )
}
