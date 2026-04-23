import jwt from 'jsonwebtoken'

export interface JwtPayload {
  employeeId: number
  role: string
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not set')
  return secret
}

const EXPIRES_IN_MS = 24 * 60 * 60 * 1000

export function signToken(payload: JwtPayload): { token: string; expiresAt: Date } {
  const token = jwt.sign(payload, getSecret(), { expiresIn: '24h' })
  const expiresAt = new Date(Date.now() + EXPIRES_IN_MS)
  return { token, expiresAt }
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret()) as JwtPayload
}
