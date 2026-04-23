import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate.js'
import { authorize } from '../middlewares/authorize.js'
import { listReports, getReport, createReport, updateReport, deleteReport } from '../controllers/reports.js'

const router = Router()

router.use(authenticate)

router.get('/', listReports)
router.get('/:id', getReport)
router.post('/', authorize('sales', 'admin'), createReport)
router.put('/:id', updateReport)
router.delete('/:id', authorize('admin'), deleteReport)

export default router
