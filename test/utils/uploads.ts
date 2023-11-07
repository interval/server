import env from 'env'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export async function generateS3Urls(key: string) {
  if (!env.S3_KEY_ID || !env.S3_KEY_SECRET || !env.S3_REGION) {
    throw new Error('Missing S3 credentials for generateUploadUrl')
  }

  const s3Client = new S3Client({
    region: env.S3_REGION,
    credentials: {
      accessKeyId: env.S3_KEY_ID,
      secretAccessKey: env.S3_KEY_SECRET,
    },
  })

  const command = new PutObjectCommand({
    // always use this bucket for test uploads.
    // it has public access configured so upload contents can be validated.
    Bucket: 'interval-io-uploads-dev',
    Key: key,
  })

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 3600, // 1 hour
  })

  const url = new URL(uploadUrl)
  const downloadUrl = url.origin + url.pathname

  return { uploadUrl, downloadUrl }
}
