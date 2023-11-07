import express from 'express'
import auth from './auth'
import callback from './callback'
import signInWithGoogle from './sign-in-with-google'
import env from 'env'

export { workos, isWorkOSEnabled } from '~/server/auth'
export const REDIRECT_URI = `${env.APP_URL}/api/auth/sso/callback`

const router = express.Router()

router.get('/sign-in-with-google', signInWithGoogle)
router.get('/callback', callback)
router.get('/auth', auth)

export default router
