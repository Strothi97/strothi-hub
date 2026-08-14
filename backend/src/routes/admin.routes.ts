import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requireAdmin } from '../middleware/authorize'
import { listUsers, createUserByAdmin, updateUser, setToolAccess } from '../controllers/admin.controller'

const router = Router()

router.use(authenticate, requireAdmin)

router.get('/users', listUsers)
router.post('/users', createUserByAdmin)
router.patch('/users/:id', updateUser)
router.put('/users/:id/tool-access', setToolAccess)

export default router
