import { Router } from 'express'
import authRoutes from './auth.routes'
// import userRoutes from './user.routes'
// Weitere Routen hier importieren

export const router = Router()

// Gesundheitscheck
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routen registrieren
router.use('/auth', authRoutes)
// router.use('/users', userRoutes)
