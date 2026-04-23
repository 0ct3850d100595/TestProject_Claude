import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma.js'
import { signToken, verifyToken } from '../lib/jwt.js'
import { addToBlacklist, isBlacklisted } from '../lib/tokenBlacklist.js'
import { loginSchema } from '../validators/auth.js'

export async function login(req: Request, res: Response): Promise<void> {
  const result = loginSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '入力内容に誤りがあります',
        details: result.error.errors.map((e) => ({
          field: String(e.path[0] ?? ''),
          message: e.message,
        })),
      },
    })
    return
  }

  const { email, password } = result.data

  const employee = await prisma.employee.findFirst({
    where: { email, deletedAt: null },
  })

  const unauthorized = (): void => {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'メールアドレスまたはパスワードが正しくありません',
      },
    })
  }

  if (!employee) {
    unauthorized()
    return
  }

  const passwordMatch = await bcrypt.compare(password, employee.passwordHash)
  if (!passwordMatch) {
    unauthorized()
    return
  }

  const { token, expiresAt } = signToken({ employeeId: employee.id, role: employee.role })

  res.status(200).json({
    success: true,
    data: {
      token,
      expires_at: expiresAt.toISOString(),
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        manager_id: employee.managerId,
      },
    },
  })
}

export function logout(req: Request, res: Response): void {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    addToBlacklist(authHeader.slice(7))
  }
  res.status(200).json({ success: true, data: null })
}

export async function me(req: Request, res: Response): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '認証トークンが必要です' },
    })
    return
  }

  const token = authHeader.slice(7)

  if (isBlacklisted(token)) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '認証トークンが無効または期限切れです' },
    })
    return
  }

  let payload: { employeeId: number }
  try {
    payload = verifyToken(token)
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '認証トークンが無効または期限切れです' },
    })
    return
  }

  const employee = await prisma.employee.findFirst({
    where: { id: payload.employeeId, deletedAt: null },
    include: { manager: { select: { name: true } } },
  })

  if (!employee) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '認証トークンが無効または期限切れです' },
    })
    return
  }

  res.status(200).json({
    success: true,
    data: {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      manager_id: employee.managerId,
      manager_name: employee.manager?.name ?? null,
    },
  })
}
