import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate.js'
import { authorize } from '../middlewares/authorize.js'
import { listCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer } from '../controllers/customers.js'

const router = Router()

router.use(authenticate)

router.get('/', listCustomers)
router.get('/:id', getCustomer)
router.post('/', authorize('manager', 'admin'), createCustomer)
router.put('/:id', authorize('manager', 'admin'), updateCustomer)
router.delete('/:id', authorize('admin'), deleteCustomer)

export default router
