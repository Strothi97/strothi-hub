import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requireAdmin } from '../middleware/authorize'
import { listUsers, inviteUser, resendInvite, updateUser, setToolAccess } from '../controllers/admin.controller'

const router = Router()

router.use(authenticate, requireAdmin)

router.get('/users', listUsers)
router.post('/users', inviteUser)
router.post('/users/:id/resend-invite', resendInvite)
router.patch('/users/:id', updateUser)
router.put('/users/:id/tool-access', setToolAccess)

export default router
