import { useMemo } from 'react'
import IVButton from '~/components/IVButton'
import { useSearchParams } from 'react-router-dom'

export default function AuthenticationNotConfirmedPage() {
  const [searchParams] = useSearchParams()
  const confirmError = searchParams.get('confirmError')
  const confirmErrorMessage = useMemo(() => {
    switch (confirmError) {
      case 'transaction-not-found':
        return 'Transaction not found.'
      case 'wrong-user':
        return 'Authentication was made for a different user account'
      default:
        return undefined
    }
  }, [confirmError])

  return (
    <div className="flex items-center justify-center min-h-screen text-center">
      <div>
        <h2 className="text-gray-900 h2 mb-4">
          There was a problem confirming your authentication
        </h2>
        {confirmErrorMessage && <p className="mb-2">{confirmErrorMessage}</p>}
        <p>If you continue to experience issues, please let us know.</p>
        <IVButton
          onClick={window.close}
          label="Close this page and try again"
          theme="primary"
          className="mt-4"
        />
      </div>
    </div>
  )
}
