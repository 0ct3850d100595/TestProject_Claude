import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { resetDatabase, seedEmployees, TEST_PASSWORD, type SeededEmployees } from './helpers/db.js'
import { prisma } from '../lib/prisma.js'

let employees: SeededEmployees

beforeAll(async () => {
  await resetDatabase()
  employees = await seedEmployees()
})

async function login(email: string, password = TEST_PASSWORD) {
  return request(app).post('/v1/auth/login').send({ email, password })
}

async function getToken(email: string): Promise<string> {
  const res = await login(email)
  return res.body.data.token as string
}

describe('POST /v1/auth/login', () => {
  it('正しい認証情報（admin）でJWTトークンと社員情報が返る', async () => {
    const res = await login('admin@example.com')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(typeof res.body.data.token).toBe('string')
    expect(res.body.data.expires_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(res.body.data.employee.id).toBe(employees.adminId)
    expect(res.body.data.employee.email).toBe('admin@example.com')
    expect(res.body.data.employee.role).toBe('admin')
    expect(res.body.data.employee.manager_id).toBeNull()
  })

  it('正しい認証情報（sales）でJWTトークンと社員情報が返る', async () => {
    const res = await login('sales1@example.com')

    expect(res.status).toBe(200)
    expect(res.body.data.employee.role).toBe('sales')
    expect(res.body.data.employee.manager_id).toBe(employees.managerId)
  })

  it('誤ったパスワードで401が返る', async () => {
    const res = await login('admin@example.com', 'WrongPassword99!')

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
    expect(res.body.error.message).toBe('メールアドレスまたはパスワードが正しくありません')
  })

  it('未登録メールアドレスで401が返る', async () => {
    const res = await login('nobody@example.com')

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
    expect(res.body.error.message).toBe('メールアドレスまたはパスワードが正しくありません')
  })

  it('削除済み社員でログインすると401が返る', async () => {
    await prisma.employee.update({
      where: { id: employees.otherId },
      data: { deletedAt: new Date() },
    })
    const res = await login('other@example.com')

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
    expect(res.body.error.message).toBe('メールアドレスまたはパスワードが正しくありません')
  })

  it('メール未入力でバリデーションエラーが返る', async () => {
    const res = await request(app).post('/v1/auth/login').send({ password: TEST_PASSWORD })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    const fields = (res.body.error.details as Array<{ field: string }>).map((d) => d.field)
    expect(fields).toContain('email')
  })

  it('パスワード未入力でバリデーションエラーが返る', async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'admin@example.com' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    const fields = (res.body.error.details as Array<{ field: string }>).map((d) => d.field)
    expect(fields).toContain('password')
  })

  it('不正なメール形式でバリデーションエラーが返る', async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'not-an-email', password: TEST_PASSWORD })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('GET /v1/auth/me', () => {
  it('有効なトークンでログインユーザー情報が返る', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.email).toBe('sales1@example.com')
    expect(res.body.data.role).toBe('sales')
    expect(res.body.data.manager_name).toBe('部長 花子')
    expect(res.body.data.manager_id).toBe(employees.managerId)
  })

  it('Authorizationヘッダーなしで401が返る', async () => {
    const res = await request(app).get('/v1/auth/me')

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  it('不正な形式のトークンで401が返る', async () => {
    const res = await request(app)
      .get('/v1/auth/me')
      .set('Authorization', 'Bearer invalid.jwt.token')

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  it('Bearer プレフィックスなしで401が返る', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .get('/v1/auth/me')
      .set('Authorization', token)

    expect(res.status).toBe(401)
  })
})

describe('POST /v1/auth/logout', () => {
  it('ログアウト後に同じトークンでのAPIアクセスが401を返す', async () => {
    const token = await getToken('manager@example.com')

    const logoutRes = await request(app)
      .post('/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`)
    expect(logoutRes.status).toBe(200)
    expect(logoutRes.body.success).toBe(true)
    expect(logoutRes.body.data).toBeNull()

    const meRes = await request(app)
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
    expect(meRes.status).toBe(401)
    expect(meRes.body.error.code).toBe('UNAUTHORIZED')
  })

  it('トークンなしでログアウトしても200が返る', async () => {
    const res = await request(app).post('/v1/auth/logout')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})
