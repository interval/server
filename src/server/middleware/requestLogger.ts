import { Request, Response, NextFunction } from 'express'
import { logger } from '~/server/utils/logger'

function startTimer() {
  const startHrTime = process.hrtime()
  return function getElapsedTime() {
    const elapsedHrTime = process.hrtime(startHrTime)
    const elapsedTimeInMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6
    return elapsedTimeInMs
  }
}

// Skip some paths that are related to the static react app
function shouldSkip(url: string): boolean {
  if (url.includes('/static/')) {
    return true
  }
  if (url.includes('hot-update.js')) {
    return true
  }
  return false
}

function shouldSkipBody(url: string): boolean {
  if (url.startsWith('/api/auth')) {
    return true
  }

  return false
}

let id = 0
export default function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { method, originalUrl } = req
  if (shouldSkip(originalUrl)) {
    return next()
  }
  id = id += 1
  const name = `${id} ${method} ${originalUrl}`
  const getElapsedTime = startTimer()
  logger.http('[Req started]', {
    name,
    body:
      req.body &&
      !shouldSkipBody(originalUrl) &&
      JSON.stringify(req.body).substring(0, 50),
  })
  res.on('finish', () => {
    logger.http('[Req finished]', {
      name,
      elapsedTimeMs: getElapsedTime().toFixed(2),
      statusCode: res.statusCode,
    })
  })
  next()
}
