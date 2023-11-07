import { Prisma, User, UsageEnvironment, UserSession } from '@prisma/client'
import generator from 'generate-password'
import * as crypto from 'crypto'
import {
  sealData,
  unsealData,
  IronSessionOptions,
  IronSessionData,
} from 'iron-session'
import WorkOS from '@workos-inc/node'
import type { NextFunction, Request, Response } from 'express'

// Must be relative because this file is imported from server.ts
import env from 'env'
import prisma from './prisma'
import { AUTH_COOKIE_NAME } from '../utils/isomorphicConsts'
import { ironSession } from 'iron-session/express'
import { confirmEmail } from '~/emails'
import { AuthenticationError } from '~/utils/auth'
import { getDomain } from '~/utils/email'

export { AuthenticationError }

let workos: WorkOS | undefined
export const isWorkOSEnabled: boolean =
  !!env.WORKOS_API_KEY && !!env.WORKOS_CLIENT_ID

if (isWorkOSEnabled) {
  workos = new WorkOS(env.WORKOS_API_KEY)
}

export { workos }

export const defaultIdentityConfirmGracePeriod = 1000 * 60 * 5 // 5 minutes

export function encryptPassword(password: string): string {
  return crypto
    .pbkdf2Sync(password, env.SECRET, 1000, 64, 'sha512')
    .toString('hex')
}

export function generatePassword(): string {
  return generator.generate({
    length: 24,
    numbers: true,
    symbols: true,
  })
}

export function generateKey(
  user: Pick<User, 'firstName'>,
  env: UsageEnvironment
): string {
  const key = generator.generate({
    length: 48,
    numbers: true,
    symbols: false,
  })

  const envKey = `${usageEnvironmentToKeyPrefix(env)}_${key}`

  if (env === 'DEVELOPMENT' && user.firstName) {
    const namePrefix = user.firstName.toLowerCase().replace(/\W/g, '')
    return `${namePrefix}_${envKey}`
  }

  return envKey
}

function usageEnvironmentToKeyPrefix(env: UsageEnvironment) {
  switch (env) {
    case 'PRODUCTION':
      return 'live'
    case 'DEVELOPMENT':
      return 'dev'
  }
}

export type SessionUserData = Prisma.UserGetPayload<{
  select: {
    id: true
    lastName: true
    firstName: true
    email: true
    mfaId: true
  }
}>

export interface SuccessfulLoginResult {
  user: SessionUserData
  session: UserSession
}

export async function loginWithApiKey(key: string) {
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      organization: {
        deletedAt: null,
      },
      OR: [
        {
          key,
          usageEnvironment: 'DEVELOPMENT',
        },
        {
          key: encryptPassword(key),
          usageEnvironment: 'PRODUCTION',
        },
      ],
    },
    include: {
      user: {
        // We don't want to possibly leak private info, and don't need it here anyway
        select: {
          id: true,
          lastName: true,
          firstName: true,
          email: true,
          mfaId: true,
        },
      },
      organization: true,
      organizationEnvironment: true,
    },
  })

  if (!apiKey || apiKey.deletedAt) return null

  return {
    user: apiKey.user,
    organization: apiKey.organization,
    organizationEnvironment: apiKey.organizationEnvironment,
    apiKey,
  }
}

export async function enrollMfa(user: Pick<User, 'mfaId' | 'email'>) {
  if (!workos) {
    throw new Error(
      'WorkOS credentials not found, WorkOS integration not enabled.'
    )
  }

  return workos.mfa.enrollFactor({
    type: 'totp',
    issuer: 'Interval',
    user: user.email,
  })
}

export async function challengeMfa(mfaId: string) {
  if (!workos) {
    throw new Error(
      'WorkOS credentials not found, WorkOS integration not enabled.'
    )
  }

  const response = await workos.mfa.challengeFactor({
    authenticationFactorId: mfaId,
  })

  return prisma.userMfaChallenge.create({
    data: {
      id: response.id,
      mfaId,
      createdAt: response.created_at,
      updatedAt: response.updated_at,
      expiresAt: response.expires_at,
    },
  })
}

export async function verifyMfa(
  challengeId: string,
  code: string,
  session: UserSession
) {
  if (!workos) {
    throw new Error(
      'WorkOS credentials not found, WorkOS integration not enabled.'
    )
  }

  try {
    const response = await workos.mfa.verifyChallenge({
      authenticationChallengeId: challengeId,
      code,
    })

    if (!response.valid) {
      throw new AuthenticationError('INVALID')
    }
  } catch (err) {
    if (err instanceof AuthenticationError) {
      throw err
    }

    throw new AuthenticationError('INVALID')
  }

  return prisma.userMfaChallenge.update({
    where: { id: challengeId },
    data: {
      session: { connect: { id: session.id } },
      verifiedAt: new Date(),
    },
  })
}

/**
 * This attempts logging in a user, returning the user and the session if successful or throwing an AuthenticationError otherwise.
 */
export async function tryLogin(
  email: string,
  password: string
): Promise<SuccessfulLoginResult> {
  const user = await prisma.user.findFirst({
    where: {
      email: email,
      password: encryptPassword(password),
    },
    select: {
      id: true,
      lastName: true,
      firstName: true,
      email: true,
      mfaId: true,
    },
  })

  if (!user) {
    throw new AuthenticationError('NOT_FOUND', 'No user found')
  }

  const session = await createUserSession(user)

  return {
    user,
    session,
  }
}

export async function createUserSession(
  user: Pick<User, 'id'>,
  { ssoAccessToken }: { ssoAccessToken?: string } = {}
): Promise<UserSession> {
  return prisma.userSession.create({
    data: {
      user: {
        connect: {
          id: user.id,
        },
      },
      ssoAccessToken,
    },
  })
}

export async function validateSession(
  id: string
): Promise<SuccessfulLoginResult> {
  try {
    const session = await prisma.userSession.update({
      where: { id },
      data: {
        lastUsedAt: new Date(),
      },
      include: {
        mfaChallenge: true,
        user: {
          select: {
            id: true,
            lastName: true,
            firstName: true,
            email: true,
            mfaId: true,
          },
        },
      },
    })

    if (isWorkOSEnabled && session.user.mfaId && !session.mfaChallenge) {
      throw new AuthenticationError('NEEDS_MFA')
    }

    if (session.mfaChallenge && !session.mfaChallenge.verifiedAt) {
      throw new AuthenticationError('INVALID')
    }

    const { user, mfaChallenge, ...cleanedSession } = session

    return {
      session: cleanedSession,
      user,
    }
  } catch (e) {
    if (e instanceof AuthenticationError) {
      throw e
    } else {
      // Invalid session, not found
      throw new AuthenticationError('NOT_FOUND')
    }
  }
}

export async function logoutSession(id: string) {
  try {
    return prisma.userSession.deleteMany({
      where: { id },
    })
  } catch (err) {
    // No session to log out!
  }
}

export async function unsealSessionCookie(
  cookie: string
): Promise<IronSessionData> {
  return unsealData<IronSessionData>(cookie, {
    password: ironSessionOptions.password,
    ttl: ironSessionOptions.ttl,
  })
}

const appDomain = new URL(env.APP_URL).hostname

export const ironSessionOptions: IronSessionOptions = {
  cookieName: AUTH_COOKIE_NAME,
  password: env.AUTH_COOKIE_SECRET,
  ttl: 0,
  cookieOptions: {
    domain: appDomain,
    secure: process.env.NODE_ENV === 'production',
  },
}

export function clearDomainlessCookie(
  _req: Request,
  res: Response,
  next?: NextFunction
) {
  if (appDomain && appDomain !== 'localhost') {
    res.clearCookie(AUTH_COOKIE_NAME, {
      // iron-session defaults
      httpOnly: true,
      path: '/',
      sameSite: 'lax',

      // our overrides
      ...ironSessionOptions.cookieOptions,

      // domainless
      domain: undefined,
    })
  }
  next?.()
}

export const sessionMiddleware = ironSession(ironSessionOptions)

export async function createResetUrl(resetTokenId: string): Promise<string> {
  const seal = await sealData(
    {
      resetTokenId,
    },
    {
      password: ironSessionOptions.password,
    }
  )

  return `${env.APP_URL}/reset-password?seal=${seal}`
}

export async function requestEmailConfirmation(
  user: Pick<User, 'id' | 'email'>,
  newEmail?: string
) {
  let token = await prisma.userEmailConfirmToken.findFirst({
    where: { userId: user.id },
  })

  if (token && (token.expiresAt < new Date() || newEmail)) {
    // if regenerating a token for an email change, include the email with the new token
    if (token.email && !newEmail) {
      newEmail = token.email
    }

    // remove existing token and generate a new one
    await prisma.userEmailConfirmToken.delete({
      where: { userId: user.id },
    })

    token = null
  }

  if (!token) {
    token = await prisma.userEmailConfirmToken.create({
      data: {
        user: { connect: { id: user.id } },
        email: newEmail,
      },
    })
  }

  const confirmUrl = await getConfirmUrl(token.id)

  await confirmEmail(newEmail ?? user.email, {
    confirmUrl,
    isEmailChange: !!newEmail,
  })
}

export async function getConfirmUrl(confirmTokenId: string) {
  const seal = await sealData(
    {
      confirmTokenId,
    },
    {
      password: ironSessionOptions.password,
    }
  )

  return `${env.APP_URL}/confirm-email?seal=${seal}`
}

declare module 'iron-session' {
  interface IronSessionData {
    // We may want to add to this
    user?: SessionUserData
    session?: UserSession
    currentOrganizationId?: string
    currentOrganizaitonEnvironmentId?: string
  }
}

export async function requiredIdentityConfirmation(
  user: User
): Promise<'MFA' | 'SSO' | 'PASSWORD' | 'LOGIN_WITH_GOOGLE'> {
  const domain = getDomain(user.email)
  const sso = await prisma.organizationSSO.findFirst({
    where: {
      domain,
      workosOrganizationId: {
        not: null,
      },
    },
  })

  if (isWorkOSEnabled && user.mfaId) {
    return 'MFA'
  } else if (isWorkOSEnabled && sso) {
    return 'SSO'
  } else if (isWorkOSEnabled && !user.password) {
    return 'LOGIN_WITH_GOOGLE'
  } else {
    return 'PASSWORD'
  }
}
