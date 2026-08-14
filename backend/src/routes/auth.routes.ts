import { Router } from 'express'
import { login, getMe } from '../controllers/auth.controller'
import { authenticate } from '../middleware/authenticate'
// import { validateLogin } from '../middleware/validators'

const router = Router()

// Keine öffentliche Registrierung: Nutzer werden über /api/admin/users
// vom Admin angelegt. Falls später eine öffentliche Registrierung
// gewünscht ist (z.B. für ein kostenpflichtiges Tool), kann hier wieder
// eine Route ergänzt werden, die createUser() aus auth.service nutzt.
router.post('/login', login)
router.get('/me', authenticate, getMe)

export default router
