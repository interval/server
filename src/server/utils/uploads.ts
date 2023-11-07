import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  DeleteObjectsCommandOutput,
  ListObjectsV2CommandOutput,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import env from 'env'

function isS3Available(env: any): env is {
  S3_KEY_ID: string
  S3_KEY_SECRET: string
  S3_REGION: string
  S3_BUCKET: string
} {
  return (
    typeof env.S3_KEY_ID === 'string' &&
    typeof env.S3_KEY_SECRET === 'string' &&
    typeof env.S3_REGION === 'string' &&
    typeof env.S3_BUCKET === 'string'
  )
}

export const S3_UPLOADS_ENABLED = isS3Available(env)

function getS3Client() {
  if (!isS3Available(env)) {
    throw new Error(
      'Please provide S3 credentials to enable file uploads. Visit the docs for more info: https://interval.com/docs'
    )
  }

  return new S3Client({
    region: env.S3_REGION,
    credentials: {
      accessKeyId: env.S3_KEY_ID,
      secretAccessKey: env.S3_KEY_SECRET,
    },
  })
}

export async function getIOPresignedUploadUrl(key: string): Promise<string> {
  const s3Client = getS3Client()

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
  })

  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 3600, // 1 hour
  })

  return signedUrl
}

export async function getIOPresignedDownloadUrl(key: string): Promise<string> {
  const s3Client = getS3Client()

  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
  })

  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 48 * 60 * 60, // 48 hours
  })

  return signedUrl
}

async function deleteIOObjects(
  keys: string[]
): Promise<DeleteObjectsCommandOutput> {
  const s3Client = getS3Client()

  const command = new DeleteObjectsCommand({
    Bucket: env.S3_BUCKET,
    Delete: {
      Objects: keys.map(Key => ({ Key })),
    },
  })

  return await s3Client.send(command)
}

async function findIOObjects(
  transactionId: string
): Promise<ListObjectsV2CommandOutput> {
  const s3Client = getS3Client()

  const command = new ListObjectsV2Command({
    Bucket: env.S3_BUCKET,
    Prefix: transactionId,
  })

  return await s3Client.send(command)
}

export async function deleteTransactionUploads(transactionId: string) {
  if (!S3_UPLOADS_ENABLED) return

  const response = await findIOObjects(transactionId)
  if (response.Contents?.length) {
    const keys: string[] = response.Contents.filter(object => object.Key).map(
      object => object.Key as string
    )
    await deleteIOObjects(keys)
  }
}
