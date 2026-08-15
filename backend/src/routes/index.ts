import { Router } from 'express'
import authRoutes from './auth.routes'
import adminRoutes from './admin.routes'
import homeofficeRoutes from '../modules/homeoffice/homeoffice.routes'
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
router.get('/tools', authenticate, listTools)
