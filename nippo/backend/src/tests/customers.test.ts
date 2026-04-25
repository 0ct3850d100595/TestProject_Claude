import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import {
  resetDatabase,
  seedEmployees,
  seedCustomers,
  createReport,
  TEST_PASSWORD,
  pastDate,
  type SeededEmployees,
  type SeededCustomers,
} from './helpers/db.js'

let employees: SeededEmployees
let customers: SeededCustomers

async function getToken(email: string): Promise<string> {
  const res = await request(app)
    .post('/v1/auth/login')
    .send({ email, password: TEST_PASSWORD })
  return res.body.data.token as string
}

beforeAll(async () => {
  await resetDatabase()
  employees = await seedEmployees()
  customers = await seedCustomers()

  // customer1 を日報の訪問記録に紐付ける（削除不可テスト用）
  await createReport(employees.sales1Id, customers.customer1Id, pastDate(1))
})

describe('GET /v1/customers - 顧客一覧', () => {
  it('salesが顧客一覧を取得できる', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .get('/v1/customers')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveLength(3)
    expect(res.body.meta.total).toBe(3)
    const companyNames = (res.body.data as Array<{ company_name: string }>).map(
      (c) => c.company_name,
    )
    expect(companyNames).toContain('株式会社テスト商事')
    expect(companyNames).toContain('△△工業株式会社')
    expect(companyNames).toContain('◇◇システムズ')
  })

  it('managerが顧客一覧を取得できる', async () => {
    const token = await getToken('manager@example.com')
    const res = await request(app)
      .get('/v1/customers')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(3)
  })

  it('adminが顧客一覧を取得できる', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .get('/v1/customers')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(3)
  })

  it('会社名でキーワード検索できる', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .get('/v1/customers?keyword=テスト')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].company_name).toBe('株式会社テスト商事')
  })

  it('担当者名でキーワード検索できる', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .get('/v1/customers?keyword=鈴木')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].company_name).toBe('△△工業株式会社')
  })

  it('マッチしないキーワードで空リストが返る', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .get('/v1/customers?keyword=存在しない会社名xyz')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(0)
    expect(res.body.meta.total).toBe(0)
  })

  it('トークンなしで401が返る', async () => {
    const res = await request(app).get('/v1/customers')
    expect(res.status).toBe(401)
  })
})

describe('GET /v1/customers/:id - 顧客詳細', () => {
  it('salesが顧客詳細を取得できる', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .get(`/v1/customers/${customers.customer1Id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(customers.customer1Id)
    expect(res.body.data.company_name).toBe('株式会社テスト商事')
    expect(res.body.data.contact_name).toBe('田中 一郎')
    expect(res.body.data.phone).toBe('03-1111-2222')
    expect(res.body.data.email).toBe('tanaka@test.co.jp')
  })

  it('存在しない顧客IDで404が返る', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .get('/v1/customers/99999')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })
})

describe('POST /v1/customers - 顧客登録', () => {
  it('managerが顧客を登録できる（201）', async () => {
    const token = await getToken('manager@example.com')
    const res = await request(app)
      .post('/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        company_name: '新規株式会社',
        contact_name: '新規 担当者',
        phone: '03-9999-8888',
        email: 'new@company.co.jp',
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.company_name).toBe('新規株式会社')
    expect(res.body.data.contact_name).toBe('新規 担当者')
    expect(res.body.data.id).toBeTypeOf('number')
  })

  it('adminが顧客を登録できる（201）', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .post('/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: 'Admin登録会社', contact_name: '担当 太郎' })

    expect(res.status).toBe(201)
    expect(res.body.data.company_name).toBe('Admin登録会社')
    expect(res.body.data.phone).toBeNull()
    expect(res.body.data.email).toBeNull()
  })

  it('salesが顧客を登録しようとすると403が返る', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .post('/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: '不正登録会社', contact_name: '担当者' })

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('会社名未入力でバリデーションエラーが返る', async () => {
    const token = await getToken('manager@example.com')
    const res = await request(app)
      .post('/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ contact_name: '担当者' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    const fields = (res.body.error.details as Array<{ field: string }>).map((d) => d.field)
    expect(fields).toContain('company_name')
  })

  it('担当者名未入力でバリデーションエラーが返る', async () => {
    const token = await getToken('manager@example.com')
    const res = await request(app)
      .post('/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: '会社名' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    const fields = (res.body.error.details as Array<{ field: string }>).map((d) => d.field)
    expect(fields).toContain('contact_name')
  })

  it('会社名が101文字でバリデーションエラーが返る（境界値）', async () => {
    const token = await getToken('manager@example.com')
    const res = await request(app)
      .post('/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: 'a'.repeat(101), contact_name: '担当者' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('会社名が100文字で正常に登録できる（境界値）', async () => {
    const token = await getToken('manager@example.com')
    const res = await request(app)
      .post('/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: 'a'.repeat(100), contact_name: '担当者' })

    expect(res.status).toBe(201)
  })
})

describe('PUT /v1/customers/:id - 顧客更新', () => {
  it('managerが顧客情報を更新できる（200）', async () => {
    const token = await getToken('manager@example.com')
    const res = await request(app)
      .put(`/v1/customers/${customers.customer3Id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: '◇◇システムズ更新', contact_name: '高橋 更新太郎' })

    expect(res.status).toBe(200)
    expect(res.body.data.company_name).toBe('◇◇システムズ更新')
    expect(res.body.data.contact_name).toBe('高橋 更新太郎')
  })

  it('salesが顧客情報を更新しようとすると403が返る', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .put(`/v1/customers/${customers.customer1Id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: '不正更新', contact_name: '担当者' })

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })
})

describe('DELETE /v1/customers/:id - 顧客削除', () => {
  it('訪問記録に紐付いている顧客を削除しようとすると400が返る', async () => {
    const token = await getToken('admin@example.com')
    // customer1 は beforeAll で日報の訪問記録に紐付いている
    const res = await request(app)
      .delete(`/v1/customers/${customers.customer1Id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.message).toBe('訪問記録に紐付いている顧客は削除できません')
  })

  it('salesが顧客を削除しようとすると403が返る', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .delete(`/v1/customers/${customers.customer3Id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('managerが顧客を削除しようとすると403が返る', async () => {
    const token = await getToken('manager@example.com')
    const res = await request(app)
      .delete(`/v1/customers/${customers.customer3Id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('adminが訪問記録に紐付かない顧客を論理削除できる（200）', async () => {
    const token = await getToken('admin@example.com')
    // customer3 は訪問記録に紐付いていない
    const res = await request(app)
      .delete(`/v1/customers/${customers.customer3Id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toBeNull()
  })

  it('論理削除された顧客が一覧に含まれない', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .get('/v1/customers')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    const ids = (res.body.data as Array<{ id: number }>).map((c) => c.id)
    expect(ids).not.toContain(customers.customer3Id)
  })

  it('論理削除された顧客の詳細取得で404が返る', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .get(`/v1/customers/${customers.customer3Id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })
})
