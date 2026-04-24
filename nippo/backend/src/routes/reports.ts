import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate.js'
import { authorize } from '../middlewares/authorize.js'
import { listReports, getReport, createReport, updateReport, deleteReport } from '../controllers/reports.js'
import { addVisitRecord, updateVisitRecord, deleteVisitRecord } from '../controllers/visitRecords.js'
import { postComment } from '../controllers/comments.js'

const router = Router()

router.use(authenticate)

router.get('/', listReports)
router.get('/:id', getReport)
router.post('/', authorize('sales', 'admin'), createReport)
router.put('/:id', updateReport)
router.delete('/:id', authorize('admin'), deleteReport)

router.post('/:report_id/visit_records', addVisitRecord)
router.put('/:report_id/visit_records/:id', updateVisitRecord)
router.delete('/:report_id/visit_records/:id', deleteVisitRecord)

router.post('/:report_id/comment', postComment)

export default router
