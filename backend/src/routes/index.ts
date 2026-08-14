import { Router } from 'express'
import authRoutes from './auth.routes'
import adminRoutes from './admin.routes'
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
router.get('/tools', authenticate, listTools)
