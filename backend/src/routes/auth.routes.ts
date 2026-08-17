import { Router } from 'express'
import { login, getMe, getInvite, acceptInvite, changePassword } from '../controllers/auth.controller'
import { authenticate } from '../middleware/authenticate'
// import { validateLogin } from '../middleware/validators'

const router = Router()

// Keine öffentliche Registrierung: Nutzer werden über /api/admin/users
// vom Admin per E-Mail-Einladung angelegt (siehe /invite/:token unten).
router.post('/login', login)
router.get('/me', authenticate, getMe)
router.post('/change-password', authenticate, changePassword)

// Öffentlich (kein Login nötig — der Token selbst ist der Nachweis).
router.get('/invite/:token', getInvite)
router.post('/invite/:token', acceptInvite)

export default router
