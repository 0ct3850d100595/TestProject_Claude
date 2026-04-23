import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate.js'
import { login, logout, me } from '../controllers/auth.js'

const router = Router()

router.post('/login', login)
router.post('/logout', logout)
router.get('/me', authenticate, me)

export default router
