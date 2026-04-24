import { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { customerSchema, customerListQuerySchema } from '../validators/customers.js'

function parsePositiveInt(value: string): number | null {
  const n = parseInt(value, 10)
  return isNaN(n) || n <= 0 ? null : n
}

function validationErrorResponse(details: { field: string; message: string }[]) {
  return {
    success: false,
    error: { code: 'VALIDATION_ERROR', message: '入力内容に誤りがあります', details },
  }
}

function formatCustomer(c: {
  id: number
  companyName: string
  contactName: string
  phone: string | null
  email: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: c.id,
    company_name: c.companyName,
    contact_name: c.contactName,
    phone: c.phone,
    email: c.email,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  }
}

const CUSTOMER_SELECT = {
  id: true,
  companyName: true,
  contactName: true,
  phone: true,
  email: true,
  createdAt: true,
  updatedAt: true,
} as const

export async function listCustomers(req: Request, res: Response): Promise<void> {
  const queryResult = customerListQuerySchema.safeParse(req.query)
  if (!queryResult.success) {
    res.status(400).json(
      validationErrorResponse(
        queryResult.error.errors.map((e) => ({ field: String(e.path[0] ?? ''), message: e.message })),
      ),
    )
    return
  }

  const { page, per_page, keyword, sort, order } = queryResult.data

  const where = {
    deletedAt: null,
    ...(keyword
      ? {
          OR: [
            { companyName: { contains: keyword } },
            { contactName: { contains: keyword } },
          ],
        }
      : {}),
  }

  const sortField = sort === 'contact_name' ? 'contactName' : 'companyName'

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      select: CUSTOMER_SELECT,
      orderBy: { [sortField]: order },
      skip: (page - 1) * per_page,
      take: per_page,
    }),
  ])

  res.json({
    success: true,
    data: customers.map(formatCustomer),
    pagination: {
      total,
      page,
      per_page,
      total_pages: Math.ceil(total / per_page),
    },
  })
}

export async function getCustomer(req: Request, res: Response): Promise<void> {
  const id = parsePositiveInt(String(req.params.id))
  if (!id) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '顧客が見つかりません' } })
    return
  }

  const customer = await prisma.customer.findFirst({
    where: { id, deletedAt: null },
    select: CUSTOMER_SELECT,
  })
  if (!customer) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '顧客が見つかりません' } })
    return
  }

  res.json({ success: true, data: formatCustomer(customer) })
}

export async function createCustomer(req: Request, res: Response): Promise<void> {
  const result = customerSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json(
      validationErrorResponse(
        result.error.errors.map((e) => ({ field: String(e.path[0] ?? ''), message: e.message })),
      ),
    )
    return
  }

  const { company_name, contact_name, phone, email } = result.data
  const customer = await prisma.customer.create({
    data: {
      companyName: company_name,
      contactName: contact_name,
      phone: phone ?? null,
      email: email ?? null,
    },
    select: CUSTOMER_SELECT,
  })

  res.status(201).json({ success: true, data: formatCustomer(customer) })
}

export async function updateCustomer(req: Request, res: Response): Promise<void> {
  const id = parsePositiveInt(String(req.params.id))
  if (!id) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '顧客が見つかりません' } })
    return
  }

  const result = customerSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json(
      validationErrorResponse(
        result.error.errors.map((e) => ({ field: String(e.path[0] ?? ''), message: e.message })),
      ),
    )
    return
  }

  const existing = await prisma.customer.findFirst({ where: { id, deletedAt: null }, select: { id: true } })
  if (!existing) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '顧客が見つかりません' } })
    return
  }

  const { company_name, contact_name, phone, email } = result.data
  const customer = await prisma.customer.update({
    where: { id },
    data: {
      companyName: company_name,
      contactName: contact_name,
      phone: phone ?? null,
      email: email ?? null,
    },
    select: CUSTOMER_SELECT,
  })

  res.json({ success: true, data: formatCustomer(customer) })
}

export async function deleteCustomer(req: Request, res: Response): Promise<void> {
  const id = parsePositiveInt(String(req.params.id))
  if (!id) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '顧客が見つかりません' } })
    return
  }

  const existing = await prisma.customer.findFirst({ where: { id, deletedAt: null }, select: { id: true } })
  if (!existing) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '顧客が見つかりません' } })
    return
  }

  const linked = await prisma.visitRecord.count({ where: { customerId: id } })
  if (linked > 0) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '訪問記録に紐付いている顧客は削除できません' },
    })
    return
  }

  await prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } })

  res.json({ success: true, data: null })
}
