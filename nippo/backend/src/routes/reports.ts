import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate.js'
import { listReports, getReport } from '../controllers/reports.js'

const router = Router()

router.use(authenticate)

router.get('/', listReports)
router.get('/:id', getReport)

export default router
