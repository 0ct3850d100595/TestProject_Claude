import { Request, Response, NextFunction } from 'express'
import type { Role } from '../generated/prisma/client.js'

export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'この操作を行う権限がありません' },
      })
      return
    }
    next()
  }
}
