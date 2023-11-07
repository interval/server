import { z } from 'zod'
import { createRouter } from './util'
import { TRPCError } from '@trpc/server'
import {
  getIOPresignedUploadUrl,
  getIOPresignedDownloadUrl,
  S3_UPLOADS_ENABLED,
} from '../utils/uploads'
import { logger } from '~/server/utils/logger'

export const uploadsRouter = createRouter().mutation('io.urls', {
  input: z.object({
    transactionId: z.string(),
    inputGroupKey: z.string(),
    objectKeys: z.array(z.string()),
  }),
  async resolve({
    ctx: { prisma, organizationId },
    input: { transactionId, inputGroupKey, objectKeys },
  }) {
    if (!S3_UPLOADS_ENABLED) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Upload storage has not been configured',
      })
    }

    const transaction = await prisma.transaction.findUnique({
      where: {
        id: transactionId,
      },
      include: {
        action: true,
      },
    })

    if (!transaction || transaction.action.organizationId !== organizationId) {
      throw new TRPCError({ code: 'NOT_FOUND' })
    }

    try {
      const entries: {
        objectKey: string
        uploadUrl: string
        downloadUrl: string
      }[] = []

      for (const objectKey of objectKeys) {
        const objectName = `${transaction.id}/${inputGroupKey}/${objectKey}`

        const [uploadUrl, downloadUrl] = await Promise.all([
          getIOPresignedUploadUrl(objectName),
          getIOPresignedDownloadUrl(objectName),
        ])

        entries.push({
          objectKey,
          uploadUrl,
          downloadUrl,
        })
      }

      return entries
    } catch (err) {
      logger.error('Failed generating presigned upload URL', { error: err })
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Invalid S3 credentials',
      })
    }
  },
})
