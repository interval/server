import type { Request, Response } from 'express'
import { logoutSession } from '~/server/auth'

export default async function logoutRoute(req: Request, res: Response) {
  if (req.session.session) {
    await logoutSession(req.session.session.id)
  }
  req.session.destroy()
  res.status(200).send(true)
}
