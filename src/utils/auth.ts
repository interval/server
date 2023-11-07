import { UserSession } from '@prisma/client'
import { ME_LOCAL_STORAGE_KEY } from '~/utils/isomorphicConsts'

export type AuthenticationErrorCode =
  | 'INVALID'
  | 'NOT_FOUND'
  | 'NEEDS_MFA'
  | 'MFA_REQUIRED'
  | 'EXPIRED'
  | 'ALREADY_ENROLLED'

export class AuthenticationError extends Error {
  code: AuthenticationErrorCode

  constructor(code: AuthenticationErrorCode, message?: string) {
    super(message)
    this.code = code
  }
}

export async function tryLogin(input: {
  email: string
  password: string
  transactionId?: string
}) {
  return fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
}

export async function logout() {
  // Remove any cached login state in localStorage
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(ME_LOCAL_STORAGE_KEY)
  }

  return fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })
}

export async function tryPasswordReset(input: {
  password: string
  passwordConfirm: string
  seal: string
}) {
  return fetch('/api/auth/reset', {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function checkSession(cookie?: string): Promise<boolean> {
  try {
    const r = await fetch('/api/auth/session', {
      credentials: 'include',
      headers: cookie
        ? {
            cookie,
          }
        : undefined,
    })

    if (r.ok) {
      return true
    }

    const body = await r.json()
    if ('code' in body && body.code === 'NEEDS_MFA') {
      throw new AuthenticationError('NEEDS_MFA')
    }
    return false
  } catch (err) {
    if (err instanceof AuthenticationError) {
      throw err
    }

    return false
  }
}

export function sessionHasMfa(session: UserSession) {
  return session.mfaChallengeId
}
