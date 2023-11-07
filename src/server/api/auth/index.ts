import express from 'express'
import ghostRouter from './ghost'
import loginRoute from './login'
import logoutRoute from './logout'
import resetPasswordRoute from './reset'
import sessionRoute from './session'
import ssoRouter from './sso'
import oauthRouter from './oauth'

const router = express.Router()

router.post('/login', loginRoute)
router.get('/session', sessionRoute)
router.post('/reset', resetPasswordRoute)
router.post('/logout', logoutRoute)
router.use('/sso', ssoRouter)
router.use('/oauth', oauthRouter)
router.use('/ghost', ghostRouter)

export default router
