import prisma from '~/server/prisma'
import type { Request, Response } from 'express'
import fetch from 'node-fetch'
import { URLSearchParams } from 'url'
import env from 'env'
import { logger } from '~/server/utils/logger'

const SLACK_OAUTH_ACCESS_URL = 'https://slack.com/api/oauth.v2.access'

export default async function slackOauth(req: Request, res: Response) {
  if (!req.session.session) {
    res.status(401).end()
    return
  }

  if (!env.SLACK_CLIENT_ID) {
    throw new Error('Missing SLACK_CLIENT_ID environment variable')
  }
  if (!env.SLACK_CLIENT_SECRET) {
    throw new Error('Missing SLACK_CLIENT_SECRET environment variable')
  }

  let oauthResult = 'error'
  const { code, error, state } = req.query

  const org = await prisma.organization.findUnique({
    where: {
      id: req.session.currentOrganizationId,
    },
  })

  if (!req.session.user) {
    throw new Error('Attempted slack oauth for session without a user?')
  }

  if (!org) {
    throw new Error('Attempted slack oauth for user session without a org?')
  }

  const access = await prisma.userOrganizationAccess.findFirst({
    where: {
      user: { id: req.session.user.id },
      organization: {
        id: req.session.currentOrganizationId,
      },
    },
  })

  if (!access) {
    throw new Error(
      'Attempted slack oauth for user session without a org access?'
    )
  }

  if (access.slackOauthNonce !== state) {
    oauthResult = 'invalid_state_param'
  } else if (error) {
    oauthResult = error as string
  } else if (code) {
    const rawResponse = await fetch(SLACK_OAUTH_ACCESS_URL, {
      method: 'POST',
      body: new URLSearchParams({
        code: code as string,
        redirect_uri: `${env.APP_URL}/api/auth/oauth/slack`,
        client_id: env.SLACK_CLIENT_ID,
        client_secret: env.SLACK_CLIENT_SECRET,
      }),
    })

    const response = await rawResponse.json()

    if (response.access_token) {
      await prisma.organization.update({
        where: {
          id: req.session.currentOrganizationId,
        },
        data: {
          private: {
            upsert: {
              create: {
                slackAccessToken: response.access_token,
              },
              update: {
                slackAccessToken: response.access_token,
              },
            },
          },
        },
      })
      oauthResult = 'success'
    } else {
      logger.error('Slack OAuth error', { error: response['error'] })
      oauthResult = 'error'
    }
  }

  res.redirect(
    `/dashboard/${org.slug}/organization/settings?oauth_result=${oauthResult}`
  )
}
