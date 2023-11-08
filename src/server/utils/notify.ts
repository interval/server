import env from '~/env'
import { actionNotification, emailNotification } from '~/emails'
import prisma from '~/server/prisma'
import {
  NotificationDelivery,
  NotificationMethod,
  User,
  UsageEnvironment,
} from '@prisma/client'
import { isEmail } from '~/utils/validate'
import { getName } from '~/utils/actions'
import { formatDateTime } from '~/utils/formatters'
import dedent from 'ts-dedent'
import {
  getChannelsFromSlackIntegration,
  slackAPICall,
  SlackAPIError,
} from '~/server/utils/slack'
import {
  ActionWithPossibleMetadata,
  NotificationWithDeliveries,
  OrganizationWithPrivate,
  TransactionWithPossibleMetadata,
} from '~/utils/types'
import type { NotificationDeliveryInstruction } from '@interval/sdk/dist/types'
import { logger } from '~/server/utils/logger'
import { makeApiCall } from './wss'

class FailedNotificationError extends Error {
  constructor(message: string) {
    super(message)
  }
}

const notify = async function ({
  message,
  title,
  transaction,
  environment,
  organization,
  deliveryInstructions,
  createdAt,
  idempotencyKey,
}: {
  message: string
  title?: string
  transaction?: NotificationTransaction
  environment: UsageEnvironment
  organization: OrganizationWithPrivate
  deliveryInstructions?: NotificationDeliveryInstruction[]
  createdAt: string
  idempotencyKey?: string
}): Promise<NotificationDeliveryInstruction[]> {
  let actionRunner: User | null = null
  if (idempotencyKey) {
    const existingNote = await prisma.notification.findFirst({
      where: {
        idempotencyKey,
        organizationId: organization.id,
      },
    })

    if (existingNote) {
      return []
    }
  }

  let instructions: NotificationDeliveryInstruction[] | undefined =
    deliveryInstructions ?? []

  if (transaction) {
    transaction.action.metadata = await prisma.actionMetadata.findFirst({
      where: {
        actionId: transaction.action.id,
      },
    })

    actionRunner = await prisma.user.findUnique({
      where: {
        id: transaction.ownerId,
      },
    })

    if (!actionRunner) {
      logger.log(
        'Attempted to notify, but no such action runner for this transaction',
        { transactionId: transaction.id }
      )
      return []
    }

    if (!instructions) {
      if (
        typeof transaction.action.metadata?.defaultNotificationDelivery ===
        'string'
      ) {
        try {
          instructions = JSON.parse(
            transaction.action.metadata.defaultNotificationDelivery
          )
        } catch (err) {
          logger.error(
            'Failed parsing defaultNotificationDelivery for action, will fall back to action runner',
            {
              actionId: transaction.action.id,
            }
          )
        }
      }

      if (!instructions) {
        instructions = [{ to: actionRunner.email }]
      }
    }
  }

  if (!instructions) {
    return []
  }

  const notification = await prisma.notification.create({
    data: {
      message,
      createdAt,
      title,
      environment,
      transactionId: transaction?.id,
      organizationId: organization.id,
      idempotencyKey,
      notificationDeliveries: {
        create: instructions.map(i => ({
          to: i.to,
          method: i.method,
        })),
      },
    },
    include: {
      notificationDeliveries: true,
    },
  })

  if (environment === 'PRODUCTION') {
    notificationWork({
      notification,
      transaction,
      organization,
    })
  }

  if (transaction) {
    makeApiCall(
      '/api/notify',
      JSON.stringify({
        transactionId: transaction.id,
        notificationId: notification.id,
      })
    ).catch(error => {
      logger.error('Failed making WSS API call to send notifications', {
        error,
        transactionId: transaction.id,
        notificationId: notification.id,
      })
    })
  }

  return instructions
}

async function notificationWork({
  notification,
  transaction,
  organization,
}: {
  notification: NotificationWithDeliveries
  transaction?: NotificationTransaction
  organization: OrganizationWithPrivate
}) {
  // To notify the action runner (or organization owner if not within action) of any failures, we run other ones first
  const owner =
    transaction?.owner ??
    (await prisma.user.findUnique({
      where: { id: organization.ownerId },
    }))
  let ownerInstructions: NotificationDelivery[] = []
  const otherInstructions: NotificationDelivery[] = []
  for (const instruction of notification.notificationDeliveries) {
    if (instruction.to === owner?.email) {
      ownerInstructions.push(instruction)
    } else {
      otherInstructions.push(instruction)
    }
  }

  const attemptedNotifications = await Promise.all(
    otherInstructions.map(async instruction => {
      try {
        let timeZoneName: string | null = null
        try {
          const user = await prisma.user.findFirst({
            where: {
              email: instruction.to,
              userOrganizationAccess: {
                some: {
                  organizationId: organization.id,
                },
              },
            },
          })
          if (user) {
            timeZoneName = user.timeZoneName
          }
        } catch (error) {
          logger.error('Failed finding user for notification time zone name', {
            error,
          })
        }

        return await sendNotification({
          message: notification.message,
          instruction,
          transaction,
          organization,
          createdAt: formatDateTime(notification.createdAt, timeZoneName),
          title: notification.title || undefined,
          failedDetails: [],
        })
      } catch (err) {
        if (err instanceof FailedNotificationError) {
          if (
            err.message ===
            `The Interval app has been uninstalled from your Slack workspace. You'll need to reconnect to send Slack notifications.`
          ) {
            await prisma.organization.update({
              where: {
                id: organization.id,
              },
              data: {
                private: {
                  update: {
                    slackAccessToken: null,
                  },
                },
              },
            })
          }
        }

        return await prisma.notificationDelivery.update({
          where: {
            id: instruction.id,
          },
          data: {
            status: 'FAILED',
            error: err instanceof Error ? err.message : 'Unknown error',
          },
        })
      }
    })
  )

  if (owner) {
    const failedDetails: NotificationDelivery[] = attemptedNotifications.filter(
      d => d.error
    )

    if (ownerInstructions.length === 0 && failedDetails.length > 0) {
      const ownerNotification = await prisma.notificationDelivery.create({
        data: {
          notification: {
            connect: {
              id: notification.id,
            },
          },
          to: owner.email,
        },
      })
      ownerInstructions = [ownerNotification]
    }

    await Promise.allSettled(
      ownerInstructions.map(async instruction => {
        await sendNotification({
          message: notification.message,
          instruction,
          transaction,
          organization,
          createdAt: formatDateTime(notification.createdAt, owner.timeZoneName),
          title: notification.title || undefined,
          failedDetails,
        })
      })
    )
  }
}

export type NotificationTransaction = TransactionWithPossibleMetadata & {
  action: ActionWithPossibleMetadata & {
    organization: OrganizationWithPrivate
  }
  owner: User
}

async function sendNotification({
  message,
  instruction,
  transaction,
  organization,
  createdAt,
  title,
  failedDetails,
}: {
  message: string
  instruction: NotificationDelivery
  transaction?: NotificationTransaction
  organization: OrganizationWithPrivate
  createdAt: string
  title?: string
  failedDetails: NotificationDelivery[]
}) {
  const { method, user } = await populateMethod(instruction, organization.id)
  const actionName = transaction ? getName(transaction?.action) : undefined
  let userFromSlackEmail: User | null = null
  switch (method) {
    case 'EMAIL':
      if (transaction && actionName) {
        await actionNotification(instruction.to, {
          message,
          title,
          metadata: {
            transactionId: transaction.id,
            orgSlug: organization.slug,
            actionName: actionName,
            actionRunner: transaction.owner.email,
            createdAt: createdAt,
          },
          failedDetails: failedDetails.map(d => {
            return {
              to: d.to,
              method: d.method || undefined,
              error: d.error || undefined,
            }
          }),
        })
      } else {
        await emailNotification(instruction.to, {
          message,
          title,
          metadata: {
            orgSlug: organization.slug,
            createdAt: createdAt,
          },
          failedDetails: failedDetails.map(d => {
            return {
              to: d.to,
              method: d.method || undefined,
              error: d.error || undefined,
            }
          }),
        })
      }
      break
    case 'SLACK':
      if (!organization.private?.slackAccessToken) {
        throw new FailedNotificationError(
          `You can't send Slack notifications until you've authorized the Interval app`
        )
      }

      userFromSlackEmail = await sendSlackNotification({
        destination: instruction.to,
        message,
        title,
        metadata: {
          transactionId: transaction?.id,
          orgSlug: organization.slug,
          actionName: actionName,
          actionRunner: transaction?.owner.email,
          createdAt: createdAt,
        },
        accessToken: organization.private.slackAccessToken,
        failedDetails,
      })
      break
  }

  return await prisma.notificationDelivery.update({
    where: {
      id: instruction.id,
    },
    data: {
      status: 'DELIVERED',
      userId: user?.id || userFromSlackEmail?.id,
    },
  })
}

type PopulatedNotificationDetails = {
  method: NotificationMethod
  user?: User
}

async function populateMethod(
  instruction: NotificationDelivery,
  organizationId: string
): Promise<PopulatedNotificationDetails> {
  const plausibleEmail = isEmail(instruction.to)
  const recipient = await prisma.user.findFirst({
    where: {
      email: instruction.to,
      userOrganizationAccess: {
        some: {
          organizationId,
        },
      },
    },
  })

  const method =
    instruction.method || recipient?.defaultNotificationMethod || 'EMAIL'

  switch (method) {
    case 'EMAIL': {
      if (!plausibleEmail) {
        throw new FailedNotificationError(
          `Not a valid email: ${instruction.to}`
        )
      }

      if (!recipient) {
        // TODO support sending emails to non-Interval users, maybe requiring an
        // explicit allowlist
        throw new FailedNotificationError(
          `Can't send email notifications to users outside of your organization: ${instruction.to}`
        )
      }

      break
    }
    case 'SLACK': {
      if (
        !plausibleEmail &&
        !plausibleSlackChannel(instruction.to) &&
        !plausibleSlackUser(instruction.to)
      ) {
        throw new FailedNotificationError(
          `Not a valid slack destination: ${instruction.to}`
        )
      }
    }
  }

  return { method, user: recipient ?? undefined }
}

async function sendSlackNotification({
  destination,
  message,
  title,
  metadata,
  accessToken,
  failedDetails,
}: {
  destination: string
  message: string
  title?: string
  metadata: {
    orgSlug: string
    actionName?: string
    transactionId?: string
    actionRunner?: string
    createdAt: string
  }
  accessToken: string
  failedDetails: NotificationDelivery[]
}): Promise<User | null> {
  let destinationId: string | undefined
  let userFromSlackEmail: User | null = null
  const transactionNotification =
    metadata.transactionId && metadata.actionName && metadata.actionRunner
  if (plausibleSlackChannel(destination)) {
    const channels = await getChannelsFromSlackIntegration(
      accessToken,
      metadata.orgSlug
    )
    const channel = channels.find(c => `#${c.name}` === destination)

    if (!channel) {
      throw new FailedNotificationError(
        `Invalid Slack channel for your workspace: ${destination}`
      )
    }

    if (!channel.is_member) {
      throw new FailedNotificationError(
        `The Interval app is not installed in this Slack channel: ${destination}`
      )
    }

    destinationId = channel.id
  } else if (plausibleSlackUser(destination)) {
    const usersResponse = await slackAPICallForNotification(
      'GET',
      'users.list',
      accessToken
    )

    if (usersResponse.error) {
      throw new FailedNotificationError(
        `Error posting notification to slack: ${usersResponse.error}`
      )
    }

    const user = usersResponse.members.find(c => `@${c.name}` === destination)

    if (!user) {
      throw new FailedNotificationError(
        `No such Slack user in your workspace: ${destination}`
      )
    }

    if (user.deleted) {
      throw new FailedNotificationError(
        `This Slack user has been deleted: ${destination}`
      )
    }

    if (user.profile.email) {
      userFromSlackEmail = await prisma.user.findUnique({
        where: {
          email: user.profile.email,
        },
      })
    }

    destinationId = user.id
  } else if (isEmail(destination)) {
    const userResponse = await slackAPICallForNotification(
      'GET',
      'users.lookupByEmail',
      accessToken,
      {
        email: destination,
      }
    )

    if (!userResponse.user) {
      throw new FailedNotificationError(
        `No Slack user with this email in your workspace: ${destination}`
      )
    }

    destinationId = userResponse.user.id
  }

  const failedNotes = failedDetails.map(
    d => `- *To:* \`${d.to}\` *Method:* \`${d.method}\` *Error:* \`${d.error}\``
  )
  const failureMessage =
    failedDetails.length > 0 && failedNotes
      ? dedent`
          :warning: This notification failed to be delivered to the following destinations:
          ${failedNotes.join('\n')}`
      : ''

  const preamble = transactionNotification
    ? `Your *${metadata.actionName}* action on Interval triggered a notification.`
    : `A notification has been triggered via Interval.`
  const messageText = title ? `>*${title}*\n>${message}` : `>${message}`
  // TODO add optional link to NotifyConfig
  const notificationLink = transactionNotification
    ? `<${env.APP_URL}/dashboard/${metadata.orgSlug}/transactions/${metadata.transactionId}|View the transaction that sent this notification here>.`
    : ``
  const text = dedent`
    ${preamble}
    ${messageText}
    ${notificationLink}

    ${failureMessage}`

  if (destinationId) {
    await slackAPICallForNotification('POST', 'chat.postMessage', accessToken, {
      channel: destinationId,
      text,
      unfurl_links: 'false',
    })
  } else {
    logger.error(
      'No destinationId for sendSlackNotification with destination',
      { destination }
    )
  }

  return userFromSlackEmail
}

async function slackAPICallForNotification(
  method: string,
  apiMethod: string,
  accessToken: string,
  params: Record<string, string> | null = null
) {
  try {
    return await slackAPICall(method, apiMethod, accessToken, params)
  } catch (err) {
    if (err instanceof SlackAPIError) {
      throw new FailedNotificationError(err.message)
    } else {
      throw err
    }
  }
}

function plausibleSlackUser(handle: string): boolean {
  return handle.startsWith('@')
}

function plausibleSlackChannel(channel: string): boolean {
  return channel.startsWith('#')
}

export default notify
