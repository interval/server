import { TRPC_ERROR_CODES_BY_KEY } from '@trpc/server/rpc'
import { QueryError } from '~/utils/trpc'

type IVAPIError = QueryError | { message: string } | null

function getErrorMessage(error?: IVAPIError) {
  if (!error) return null

  // If a custom message isn't sent by the server, convert TRPC error codes into human-readable strings
  if (Object.keys(TRPC_ERROR_CODES_BY_KEY).includes(error.message)) {
    const code = error.message as keyof typeof TRPC_ERROR_CODES_BY_KEY

    if (code === 'NOT_FOUND') {
      return 'Not found'
    }
    if (code === 'BAD_REQUEST') {
      return 'Bad request'
    }
    if (code === 'FORBIDDEN') {
      return 'Not allowed'
    }
    if (code === 'TIMEOUT') {
      return 'Request timeout'
    }
    if (code === 'INTERNAL_SERVER_ERROR') {
      return 'Internal server error'
    }
    if (code === 'UNAUTHORIZED') {
      return 'Unauthorized'
    }

    return code
      .toLowerCase()
      .split('_')
      .map(word => word[0].toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Show custom error messages returned by the API
  if (error.message) return error.message

  return 'An unknown error occurred'
}

export default function IVAPIError({
  error,
  className = 'text-red-700',
}: {
  error?: IVAPIError
  className?: string
}) {
  const message = getErrorMessage(error)

  if (!message) return null

  return <div className={className}>{message}</div>
}
