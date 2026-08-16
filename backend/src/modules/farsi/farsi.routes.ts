import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { requireTool } from '../../middleware/authorize'
import * as farsiController from './farsi.controller'

const router = Router()

router.use(authenticate, requireTool('farsi'))

router.get('/entries', farsiController.listEntries)
router.post('/entries', farsiController.createEntry)
router.put('/entries/:id', farsiController.updateEntry)
router.delete('/entries/:id', farsiController.deleteEntry)

router.post('/import', farsiController.importEntries)

router.get('/study/session', farsiController.getStudySession)
router.post('/study/:entryId/review', farsiController.reviewCard)
router.get('/study/stats', farsiController.getBoxStats)

export default router
