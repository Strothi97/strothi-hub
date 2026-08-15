import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { getDashboardPreferences, updateDashboardPreferences } from '../controllers/preferences.controller'

const router = Router()

router.use(authenticate)

router.get('/dashboard', getDashboardPreferences)
router.put('/dashboard', updateDashboardPreferences)

export default router
