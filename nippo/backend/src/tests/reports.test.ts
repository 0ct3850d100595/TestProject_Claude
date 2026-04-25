import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import {
  resetDatabase,
  seedEmployees,
  seedCustomers,
  createReport,
  createComment,
  TEST_PASSWORD,
  pastDate,
  futureDate,
  type SeededEmployees,
  type SeededCustomers,
} from './helpers/db.js'

let employees: SeededEmployees
let customers: SeededCustomers
let sales1Report1Id: number // sales1, yesterday (コメントあり)
let sales1Report2Id: number // sales1, 2日前
let sales2Report1Id: number // sales2, yesterday
let otherReport1Id: number  // other, yesterday

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

  sales1Report1Id = await createReport(employees.sales1Id, customers.customer1Id, pastDate(1))
  sales1Report2Id = await createReport(employees.sales1Id, customers.customer2Id, pastDate(2))
  sales2Report1Id = await createReport(employees.sales2Id, customers.customer1Id, pastDate(1))
  otherReport1Id = await createReport(employees.otherId, customers.customer3Id, pastDate(1))

  await createComment(sales1Report1Id, employees.managerId, '良い日報です')
})

describe('GET /v1/reports - 一覧取得', () => {
  it('salesは自分の日報のみ取得できる（employee_idパラメータは無視される）', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .get(`/v1/reports?employee_id=${employees.sales2Id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    const ids = (res.body.data as Array<{ id: number }>).map((r) => r.id)
    expect(ids).toContain(sales1Report1Id)
    expect(ids).toContain(sales1Report2Id)
    expect(ids).not.toContain(sales2Report1Id)
    expect(ids).not.toContain(otherReport1Id)
  })

  it('managerは自分と部下の日報を取得できる', async () => {
    const token = await getToken('manager@example.com')
    const res = await request(app)
      .get('/v1/reports')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    const ids = (res.body.data as Array<{ id: number }>).map((r) => r.id)
    expect(ids).toContain(sales1Report1Id)
    expect(ids).toContain(sales2Report1Id)
    expect(ids).not.toContain(otherReport1Id)
  })

  it('managerが部下以外のemployee_idを指定すると空リストが返る', async () => {
    const token = await getToken('manager@example.com')
    const res = await request(app)
      .get(`/v1/reports?employee_id=${employees.otherId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(0)
    expect(res.body.meta.total).toBe(0)
  })

  it('adminは全社員の日報を取得できる', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .get('/v1/reports')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    const ids = (res.body.data as Array<{ id: number }>).map((r) => r.id)
    expect(ids).toContain(sales1Report1Id)
    expect(ids).toContain(sales2Report1Id)
    expect(ids).toContain(otherReport1Id)
  })

  it('コメントあり日報にhas_comment=trueが返る', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .get(`/v1/reports?employee_id=${employees.sales1Id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    const report1 = (res.body.data as Array<{ id: number; has_comment: boolean }>).find(
      (r) => r.id === sales1Report1Id,
    )
    expect(report1?.has_comment).toBe(true)
    const report2 = (res.body.data as Array<{ id: number; has_comment: boolean }>).find(
      (r) => r.id === sales1Report2Id,
    )
    expect(report2?.has_comment).toBe(false)
  })

  it('トークンなしで401が返る', async () => {
    const res = await request(app).get('/v1/reports')
    expect(res.status).toBe(401)
  })
})

describe('GET /v1/reports/:id - 詳細取得', () => {
  it('salesが自分の日報を取得できる', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .get(`/v1/reports/${sales1Report1Id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(sales1Report1Id)
    expect(res.body.data.employee.id).toBe(employees.sales1Id)
    expect(res.body.data.visit_records).toHaveLength(1)
    expect(res.body.data.manager_comment).not.toBeNull()
    expect(res.body.data.manager_comment.comment).toBe('良い日報です')
  })

  it('salesが他人の日報にアクセスすると403が返る', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .get(`/v1/reports/${sales2Report1Id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('managerが部下の日報を取得できる', async () => {
    const token = await getToken('manager@example.com')
    const res = await request(app)
      .get(`/v1/reports/${sales1Report1Id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(sales1Report1Id)
  })

  it('managerが直接部下でない社員の日報にアクセスすると403が返る', async () => {
    const token = await getToken('manager@example.com')
    const res = await request(app)
      .get(`/v1/reports/${otherReport1Id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('adminが全員の日報を取得できる', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .get(`/v1/reports/${otherReport1Id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(otherReport1Id)
  })
})

describe('POST /v1/reports - 日報作成', () => {
  it('salesが今日の日付で日報を正常に作成できる', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .post('/v1/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        report_date: pastDate(0),
        problem: '今日の課題',
        plan: '明日やること',
        visit_records: [
          { customer_id: customers.customer1Id, visit_content: '商談内容', sort_order: 1 },
        ],
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.employee.id).toBe(employees.sales1Id)
    expect(res.body.data.problem).toBe('今日の課題')
    expect(res.body.data.plan).toBe('明日やること')
    expect(res.body.data.visit_records).toHaveLength(1)
    expect(res.body.data.visit_records[0].visit_content).toBe('商談内容')
  })

  it('problem・planを省略しても日報を作成できる', async () => {
    const token = await getToken('sales2@example.com')
    const res = await request(app)
      .post('/v1/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        report_date: pastDate(0),
        visit_records: [
          { customer_id: customers.customer2Id, visit_content: '訪問', sort_order: 1 },
        ],
      })

    expect(res.status).toBe(201)
    expect(res.body.data.problem).toBeNull()
    expect(res.body.data.plan).toBeNull()
  })

  it('複数の訪問記録を登録できる', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .post('/v1/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        report_date: pastDate(3),
        visit_records: [
          { customer_id: customers.customer1Id, visit_content: '訪問1', sort_order: 1 },
          { customer_id: customers.customer2Id, visit_content: '訪問2', sort_order: 2 },
          { customer_id: customers.customer3Id, visit_content: '訪問3', sort_order: 3 },
        ],
      })

    expect(res.status).toBe(201)
    expect(res.body.data.visit_records).toHaveLength(3)
  })

  it('未来日の日報作成で400が返る', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .post('/v1/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        report_date: futureDate(1),
        visit_records: [
          { customer_id: customers.customer1Id, visit_content: '訪問', sort_order: 1 },
        ],
      })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    const fields = (res.body.error.details as Array<{ field: string }>).map((d) => d.field)
    expect(fields).toContain('report_date')
  })

  it('訪問記録0件の日報作成で400が返る', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .post('/v1/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        report_date: pastDate(4),
        visit_records: [],
      })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('同一ユーザー・同一日付の重複日報作成で409が返る', async () => {
    const token = await getToken('sales1@example.com')
    // sales1Report1Id はpastDate(1)に既に存在する
    const res = await request(app)
      .post('/v1/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        report_date: pastDate(1),
        visit_records: [
          { customer_id: customers.customer1Id, visit_content: '重複テスト', sort_order: 1 },
        ],
      })

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('DUPLICATE_ENTRY')
  })

  it('managerが日報を作成しようとすると403が返る', async () => {
    const token = await getToken('manager@example.com')
    const res = await request(app)
      .post('/v1/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        report_date: pastDate(0),
        visit_records: [
          { customer_id: customers.customer1Id, visit_content: '訪問', sort_order: 1 },
        ],
      })

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('訪問内容が1001文字で400が返る（境界値）', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .post('/v1/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        report_date: pastDate(5),
        visit_records: [
          { customer_id: customers.customer1Id, visit_content: 'a'.repeat(1001), sort_order: 1 },
        ],
      })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('訪問内容が1000文字で正常に作成できる（境界値）', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .post('/v1/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        report_date: pastDate(6),
        visit_records: [
          { customer_id: customers.customer1Id, visit_content: 'a'.repeat(1000), sort_order: 1 },
        ],
      })

    expect(res.status).toBe(201)
  })
})

describe('PUT /v1/reports/:id - 日報更新', () => {
  it('salesが自分の日報を更新できる', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .put(`/v1/reports/${sales1Report2Id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        report_date: pastDate(2),
        problem: '更新後の課題',
        plan: '更新後の計画',
        visit_records: [
          { customer_id: customers.customer1Id, visit_content: '更新した訪問内容', sort_order: 1 },
        ],
      })

    expect(res.status).toBe(200)
    expect(res.body.data.problem).toBe('更新後の課題')
    expect(res.body.data.visit_records[0].visit_content).toBe('更新した訪問内容')
  })

  it('salesが他人の日報を更新しようとすると403が返る', async () => {
    const token = await getToken('sales2@example.com')
    const res = await request(app)
      .put(`/v1/reports/${sales1Report1Id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        report_date: pastDate(1),
        visit_records: [
          { customer_id: customers.customer1Id, visit_content: '不正更新', sort_order: 1 },
        ],
      })

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('managerが日報を更新しようとすると403が返る', async () => {
    const token = await getToken('manager@example.com')
    const res = await request(app)
      .put(`/v1/reports/${sales1Report1Id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        report_date: pastDate(1),
        visit_records: [
          { customer_id: customers.customer1Id, visit_content: '更新', sort_order: 1 },
        ],
      })

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('adminが任意の日報を更新できる', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .put(`/v1/reports/${sales1Report1Id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        report_date: pastDate(1),
        problem: 'admin更新',
        visit_records: [
          { customer_id: customers.customer2Id, visit_content: 'admin更新訪問', sort_order: 1 },
        ],
      })

    expect(res.status).toBe(200)
    expect(res.body.data.problem).toBe('admin更新')
  })

  it('更新時に未来日を指定すると400が返る', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .put(`/v1/reports/${sales1Report2Id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        report_date: futureDate(1),
        visit_records: [
          { customer_id: customers.customer1Id, visit_content: '訪問', sort_order: 1 },
        ],
      })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('DELETE /v1/reports/:id - 日報削除', () => {
  it('salesが日報を削除しようとすると403が返る', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .delete(`/v1/reports/${sales1Report2Id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('adminが日報を削除できる', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .delete(`/v1/reports/${sales2Report1Id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toBeNull()

    // 削除後は取得できないことを確認
    const getRes = await request(app)
      .get(`/v1/reports/${sales2Report1Id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(getRes.status).toBe(404)
  })
})
