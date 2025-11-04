import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  DeleteObjectsCommandOutput,
  ListObjectsV2CommandOutput,
  ListObjectsV2Command,
  S3ClientConfig,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import env, { Env } from '~/env'

function isS3Available(env: Env) {
  return (
    env.S3_ENABLED ||
    (typeof env.S3_KEY_ID === 'string' &&
      typeof env.S3_KEY_SECRET === 'string' &&
      typeof env.S3_REGION === 'string' &&
      typeof env.S3_BUCKET === 'string')
  )
}

export const S3_UPLOADS_ENABLED = isS3Available(env)

function getS3Client(): S3Client {
  if (!isS3Available(env)) {
    throw new Error(
      'Please provide S3 credentials to enable file uploads. Visit the docs for more info: https://interval.com/docs'
    )
  }

  let credentials: S3ClientConfig['credentials'] = undefined
  if (env.S3_KEY_ID && env.S3_KEY_SECRET) {
    credentials = {
      accessKeyId: env.S3_KEY_ID,
      secretAccessKey: env.S3_KEY_SECRET,
    }
  }

  return new S3Client({
    forcePathStyle: true,
    region: env.S3_REGION || undefined,
    credentials,
    endpoint: env.S3_ENDPOINT || undefined,
  })
}

export async function getIOPresignedUploadUrl(key: string): Promise<string> {
  const client = getS3Client()

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET || undefined,
    Key: key,
  })

  const signedUrl = await getSignedUrl(client, command, {
    expiresIn: 3600, // 1 hour
  })

  return signedUrl
}

export async function getIOPresignedDownloadUrl(key: string): Promise<string> {
  const client = getS3Client()

  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET || undefined,
    Key: key,
  })

  const signedUrl = await getSignedUrl(client, command, {
    expiresIn: 48 * 60 * 60, // 48 hours
  })

  return signedUrl
}

async function deleteIOObjects(
  keys: string[]
): Promise<DeleteObjectsCommandOutput> {
  const client = getS3Client()

  const command = new DeleteObjectsCommand({
    Bucket: env.S3_BUCKET || undefined,
    Delete: {
      Objects: keys.map(Key => ({ Key })),
    },
  })

  return await client.send(command)
}

async function findIOObjects(
  transactionId: string
): Promise<ListObjectsV2CommandOutput> {
  const client = getS3Client()

  const command = new ListObjectsV2Command({
    Bucket: env.S3_BUCKET || undefined,
    Prefix: transactionId,
  })

  return await client.send(command)
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
