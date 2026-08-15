import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { requireTool } from '../../middleware/authorize'
import * as homeofficeController from './homeoffice.controller'

const router = Router()

router.use(authenticate, requireTool('homeoffice'))

router.get('/week', homeofficeController.getWeek)
router.put('/day', homeofficeController.setDay)

router.get('/month', homeofficeController.getMonth)
router.get('/year', homeofficeController.getYear)

router.get('/adjustments', homeofficeController.listAdjustments)
router.post('/adjustments', homeofficeController.createAdjustment)
router.delete('/adjustments/:id', homeofficeController.deleteAdjustment)

router.get('/states', homeofficeController.listStates)
router.post('/states', homeofficeController.addState)
router.delete('/states/:id', homeofficeController.deleteState)

export default router
