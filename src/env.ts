import { z } from 'zod'
import dotenv from 'dotenv'

try {
  dotenv.config()
} catch (err) {
  console.error('Failed loading .env', err)
}

const schema = z.object({
  // required for basic app functionality
  APP_URL: z.string(),
  DATABASE_URL: z.string(),
  SECRET: z.string(),
  WSS_API_SECRET: z.string(),
  AUTH_COOKIE_SECRET: z.string(),

  GIT_COMMIT: z.string().optional(),
  PORT: z
    .string()
    .optional()
    .default('3000')
    .transform(v => parseInt(v)),

  // emails
  POSTMARK_API_KEY: z.string().optional(),

  // authentication
  WORKOS_API_KEY: z.string().optional(),
  WORKOS_CLIENT_ID: z.string().optional(),
  WORKOS_WEBHOOK_SECRET: z.string().optional(),

  // notifications
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),

  // file uploads
  S3_KEY_ID: z.string().optional(),
  S3_KEY_SECRET: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),

  // internal actions
  INTERNAL_TOOLS_ENDPOINT: z.string().optional(),
  INTERNAL_TOOLS_API_KEY: z.string().optional(),
})

const validated = schema.parse(process.env)

export default validated

declare global {
  // eslint-disable-next-line
  namespace NodeJS {
    // eslint-disable-next-line
    interface ProcessEnv extends z.infer<typeof schema> {}
  }
}
