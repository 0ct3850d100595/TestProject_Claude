import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../lib/jwt.js'
import { isBlacklisted } from '../lib/tokenBlacklist.js'
import { prisma } from '../lib/prisma.js'

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
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

  let employeeId: number
  try {
    const payload = verifyToken(token)
    employeeId = payload.employeeId
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '認証トークンが無効または期限切れです' },
    })
    return
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
  if (!employee || employee.deletedAt !== null) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '認証トークンが無効または期限切れです' },
    })
    return
  }

  req.user = { id: employee.id, role: employee.role, managerId: employee.managerId }
  next()
}
