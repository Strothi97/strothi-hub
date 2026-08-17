import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import * as pushController from '../controllers/push.controller'

// Push-Subscriptions sind pro Nutzer generisch (nicht an ein bestimmtes
// Tool gebunden) — deshalb hier ohne requireTool, nur authenticate.
const router = Router()

router.use(authenticate)

router.get('/public-key', pushController.getPublicKey)
router.post('/subscribe', pushController.subscribe)
router.post('/unsubscribe', pushController.unsubscribe)
router.get('/subscriptions', pushController.listSubscriptions)
router.delete('/subscriptions/:id', pushController.deleteSubscription)

export default router
