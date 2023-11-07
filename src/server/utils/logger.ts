import winston from 'winston'

const isProduction = process.env.NODE_ENV === 'production'
const level = process.env.LOG_LEVEL ?? (isProduction ? 'verbose' : 'silly')

/**
 * Custom formatter to actually send nested Error objects.
 * Basically winston.format.errors but on second-level properties.
 */
const enumerateErrorFormat = winston.format(info => {
  for (const key in info) {
    try {
      const err = info[key]
      if (err instanceof Error) {
        info[key] = {
          name: err.name,
          message: err.message,
          stack: err.stack,
          cause: err.cause,
        }
      }
    } catch (err) {
      // Just to be extra safe, this shouldn't happen
      console.error('Failed transforming Error contents', err)
    }
  }

  return info
})

const format: winston.Logform.Format = winston.format.combine(
  winston.format.errors({ stack: true }),
  enumerateErrorFormat(),
  winston.format.json()
)

let transports: winston.transport | winston.transport[] =
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.errors({ stack: true }),
      winston.format.align(),
      winston.format.colorize({
        all: true,
      }),
      winston.format.simple()
      // Useful for complex logs, maybe enable this conditionally somehow?
      // winston.format.prettyPrint({
      //   colorize: true,
      // })
    ),
  })

const logger = winston.createLogger({
  level,
  format,
  transports,
  handleExceptions: true,
  handleRejections: true,
})

export { logger }
