import type { Role } from '../generated/prisma/client.js'

declare global {
  namespace Express {
    interface Request {
      // authenticate ミドルウェアを適用したルートでのみ有効。
      // 未適用ルートで参照すると実行時 undefined になるため、必ず authenticate と組み合わせて使うこと。
      user: {
        id: number
        role: Role
        managerId: number | null
      }
    }
  }
}

export {}
