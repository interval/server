import { useEffect } from 'react'

export default function AuthenticationConfirmedPage() {
  useEffect(() => {
    setTimeout(window.close, 1000)
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen text-center">
      <div>
        <h2 className="text-gray-900 h2 mb-4">Authentication confirmed</h2>
        <p>This page should close automatically momentarily.</p>
      </div>
    </div>
  )
}
