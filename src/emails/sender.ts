import Email from 'email-templates'
import handlebars from 'handlebars'
import preview from 'preview-email'
import fs from 'fs'
import path from 'path'
import { ServerClient as PostmarkClient } from 'postmark'
import env from '~/env'
import { logger } from '~/server/utils/logger'

const TEMPLATES_FOLDER = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'email-templates'
)

handlebars.registerPartial(
  'layout',
  fs.readFileSync(path.join(TEMPLATES_FOLDER, 'partials', 'layout.hbs'), {
    encoding: 'utf-8',
  })
)

handlebars.registerPartial(
  'actionButton',
  fs.readFileSync(
    path.join(TEMPLATES_FOLDER, 'partials', 'action-button.hbs'),
    {
      encoding: 'utf-8',
    }
  )
)

handlebars.registerHelper('if_equals', function (a, b, options) {
  if (a == b) {
    //@ts-ignore
    return options.fn(this)
  }
  //@ts-ignore
  return options.inverse(this)
})

handlebars.registerHelper('unless_equals', function (a, b, options) {
  if (a !== b) {
    //@ts-ignore
    return options.fn(this)
  }
  //@ts-ignore
  return options.inverse(this)
})

const emailTemplate = new Email({
  message: {},
  views: {
    options: {
      extension: 'hbs',
    },
    root: path.join(TEMPLATES_FOLDER, 'messages'),
  },
})

type TemplateData = {
  [prop: string]: unknown
}

type PreparedEmail = {
  from: string
  to: string
  subject: string
  html: string
}

interface PrepareEmailProps<T extends TemplateData> {
  to: string
  template: string
  templateProps: T
  subjectBuilder: (opts: T) => string
}

/**
 * Prepares an email to pass to a sender, such as Postmark.
 */
async function prepareEmail<T extends TemplateData>({
  to,
  template,
  templateProps,
  subjectBuilder,
}: PrepareEmailProps<T>): Promise<PreparedEmail> {
  const emailRenderProps = { ...templateProps, APP_URL: env.APP_URL }

  const from = env.EMAIL_FROM
  const subject = subjectBuilder(templateProps)
  const html = await emailTemplate.render(template, emailRenderProps)

  return { from, to, html, subject }
}

export default function emailSender<T extends TemplateData>(
  template: string,
  subjectBuilder: PrepareEmailProps<T>['subjectBuilder'],
  senderOpts?: {
    /**
     * Configure a default preheader for this template.
     */
    preheader?: string
  }
) {
  return async function sendEmail(
    to: string,
    props: T,
    opts?: {
      /**
       * Preview the email in the browser instead of sending it.
       */
      preview?: boolean
    }
  ) {
    logger.info('✉️ Mailer: sending email to', to)

    if (process.env.NODE_ENV === 'test') {
      logger.info('> Test environment detected, not sending email')
      return
    }

    const message = await prepareEmail({
      to,
      template,
      templateProps: {
        ...props,
        preheader: props.preheader ?? senderOpts?.preheader ?? '',
      },
      subjectBuilder,
    })

    if (opts?.preview) {
      logger.info('> Preview mode enabled, not sending email')
      const htmlTmpFile = await preview(message, {
        open: false,
        openSimulator: false,
        returnHtml: true,
      }).catch((e: Error) => logger.error(e))
      return { htmlTmpFile }
    }

    // log props to the console in development (helpful for e.g. clicking verification links)
    if (process.env.NODE_ENV === 'development') {
      logger.info(props)
    }

    if (!env.POSTMARK_API_KEY) {
      logger.info('- ⚠️ Not sending email because POSTMARK_API_KEY is not set.')
      return
    }

    const postmark = new PostmarkClient(env.POSTMARK_API_KEY)

    logger.info(`> Sending "${message.subject}" to ${message.to}`)

    const response = await postmark.sendEmail({
      From: message.from,
      To: message.to,
      Subject: message.subject,
      HtmlBody: message.html,
    })

    return { response, html: message.html }
  }
}
