import express from 'express'
import slack from './slack'

const router = express.Router()

router.get('/slack', slack)

export default router
