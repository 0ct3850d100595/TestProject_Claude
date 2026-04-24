import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate.js'
import { authorize } from '../middlewares/authorize.js'
import { listEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee } from '../controllers/employees.js'

const router = Router()

router.use(authenticate)

router.get('/', authorize('admin'), listEmployees)
router.get('/:id', getEmployee)
router.post('/', authorize('admin'), createEmployee)
router.put('/:id', authorize('admin'), updateEmployee)
router.delete('/:id', authorize('admin'), deleteEmployee)

export default router
