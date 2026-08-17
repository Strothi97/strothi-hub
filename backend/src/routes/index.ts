import { Router } from 'express'
import authRoutes from './auth.routes'
import adminRoutes from './admin.routes'
import homeofficeRoutes from '../modules/homeoffice/homeoffice.routes'
import farsiRoutes from '../modules/farsi/farsi.routes'
import erinnerungenRoutes from '../modules/erinnerungen/erinnerungen.routes'
import preferencesRoutes from './preferences.routes'
import pushRoutes from './push.routes'
import { authenticate } from '../middleware/authenticate'
import { listTools } from '../controllers/tools.controller'
// Weitere Routen hier importieren

export const router = Router()

// Gesundheitscheck
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routen registrieren
router.use('/auth', authRoutes)
router.use('/admin', adminRoutes)
router.use('/homeoffice', homeofficeRoutes)
router.use('/farsi', farsiRoutes)
router.use('/erinnerungen', erinnerungenRoutes)
router.use('/preferences', preferencesRoutes)
router.use('/push', pushRoutes)
router.get('/tools', authenticate, listTools)
