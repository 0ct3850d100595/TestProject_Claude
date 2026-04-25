import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma.js'
import { createEmployeeSchema, updateEmployeeSchema, employeeListQuerySchema } from '../validators/employees.js'

const BCRYPT_ROUNDS = 10

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

const EMPLOYEE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  managerId: true,
  manager: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
} as const

function formatEmployee(e: {
  id: number
  name: string
  email: string
  role: string
  managerId: number | null
  manager: { id: number; name: string } | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: e.id,
    name: e.name,
    email: e.email,
    role: e.role,
    manager_id: e.managerId,
    manager: e.manager ? { id: e.manager.id, name: e.manager.name } : null,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  }
}

export async function listEmployees(req: Request, res: Response): Promise<void> {
  const queryResult = employeeListQuerySchema.safeParse(req.query)
  if (!queryResult.success) {
    res.status(400).json(
      validationErrorResponse(
        queryResult.error.errors.map((e) => ({ field: String(e.path[0] ?? ''), message: e.message })),
      ),
    )
    return
  }

  const { page, per_page, role: roleFilter } = queryResult.data
  const { id: userId, role: requesterRole } = req.user

  const where = {
    deletedAt: null,
    ...(roleFilter ? { role: roleFilter } : {}),
    ...(requesterRole === 'manager' ? { managerId: userId } : {}),
  }

  const [total, employees] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      select: EMPLOYEE_SELECT,
      orderBy: { id: 'asc' },
      skip: (page - 1) * per_page,
      take: per_page,
    }),
  ])

  res.json({
    success: true,
    data: employees.map(formatEmployee),
    meta: { total, page, per_page, total_pages: Math.ceil(total / per_page) },
  })
}

export async function getEmployee(req: Request, res: Response): Promise<void> {
  const id = parsePositiveInt(String(req.params.id))
  if (!id) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '社員が見つかりません' } })
    return
  }

  const { id: userId, role } = req.user
  if (role !== 'admin' && userId !== id) {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'この操作を行う権限がありません' } })
    return
  }

  const employee = await prisma.employee.findFirst({
    where: { id, deletedAt: null },
    select: EMPLOYEE_SELECT,
  })
  if (!employee) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '社員が見つかりません' } })
    return
  }

  res.json({ success: true, data: formatEmployee(employee) })
}

export async function createEmployee(req: Request, res: Response): Promise<void> {
  const result = createEmployeeSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json(
      validationErrorResponse(
        result.error.errors.map((e) => ({ field: String(e.path[0] ?? ''), message: e.message })),
      ),
    )
    return
  }

  const { name, email, password, role, manager_id } = result.data

  const existing = await prisma.employee.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE_ENTRY', message: 'このメールアドレスはすでに使用されています' },
    })
    return
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const employee = await prisma.employee.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      managerId: role === 'sales' ? (manager_id ?? null) : null,
    },
    select: EMPLOYEE_SELECT,
  })

  res.status(201).json({ success: true, data: formatEmployee(employee) })
}

export async function updateEmployee(req: Request, res: Response): Promise<void> {
  const id = parsePositiveInt(String(req.params.id))
  if (!id) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '社員が見つかりません' } })
    return
  }

  const result = updateEmployeeSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json(
      validationErrorResponse(
        result.error.errors.map((e) => ({ field: String(e.path[0] ?? ''), message: e.message })),
      ),
    )
    return
  }

  const existing = await prisma.employee.findFirst({ where: { id, deletedAt: null }, select: { id: true } })
  if (!existing) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '社員が見つかりません' } })
    return
  }

  const { name, email, password, role, manager_id } = result.data

  const emailConflict = await prisma.employee.findFirst({
    where: { email, id: { not: id } },
    select: { id: true },
  })
  if (emailConflict) {
    res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE_ENTRY', message: 'このメールアドレスはすでに使用されています' },
    })
    return
  }

  const passwordHash = password ? await bcrypt.hash(password, BCRYPT_ROUNDS) : undefined

  const employee = await prisma.employee.update({
    where: { id },
    data: {
      name,
      email,
      role,
      managerId: role === 'sales' ? (manager_id ?? null) : null,
      ...(passwordHash ? { passwordHash } : {}),
    },
    select: EMPLOYEE_SELECT,
  })

  res.json({ success: true, data: formatEmployee(employee) })
}

export async function deleteEmployee(req: Request, res: Response): Promise<void> {
  const id = parsePositiveInt(String(req.params.id))
  if (!id) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '社員が見つかりません' } })
    return
  }

  if (req.user.id === id) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '自分自身は削除できません' },
    })
    return
  }

  const existing = await prisma.employee.findFirst({ where: { id, deletedAt: null }, select: { id: true } })
  if (!existing) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '社員が見つかりません' } })
    return
  }

  await prisma.employee.update({ where: { id }, data: { deletedAt: new Date() } })

  res.json({ success: true, data: null })
}
