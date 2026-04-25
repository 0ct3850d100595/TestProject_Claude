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
  type SeededEmployees,
  type SeededCustomers,
} from './helpers/db.js'

let employees: SeededEmployees
let customers: SeededCustomers
let sales1Report1Id: number // sales1の日報（コメントあり）
let sales1Report2Id: number // sales1の日報（コメントなし）
let otherReportId: number   // other（managerの部下でない）の日報

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
  otherReportId = await createReport(employees.otherId, customers.customer3Id, pastDate(1))

  // sales1Report1Id にはコメント済み
  await createComment(sales1Report1Id, employees.managerId, '既存コメント')
})

describe('POST /v1/reports/:report_id/comment - コメント投稿', () => {
  it('managerが部下の日報にコメントを投稿できる（201）', async () => {
    const token = await getToken('manager@example.com')
    const res = await request(app)
      .post(`/v1/reports/${sales1Report2Id}/comment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ comment: '良い日報です。引き続き頑張ってください。' })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.comment).toBe('良い日報です。引き続き頑張ってください。')
    expect(res.body.data.manager.id).toBe(employees.managerId)
    expect(res.body.data.manager.name).toBe('部長 花子')
    expect(res.body.data.commented_at).toBeTruthy()
  })

  it('salesがコメントを投稿しようとすると403が返る', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .post(`/v1/reports/${sales1Report1Id}/comment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ comment: '自分でコメント' })

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('managerが直接部下でない社員の日報にコメントしようとすると403が返る', async () => {
    const token = await getToken('manager@example.com')
    // other は manager の部下でない（managerId = null）
    const res = await request(app)
      .post(`/v1/reports/${otherReportId}/comment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ comment: '部下でない日報へのコメント' })

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('同一日報への2回目のコメント投稿で409が返る', async () => {
    const token = await getToken('manager@example.com')
    // sales1Report1Id は beforeAll でコメント済み
    const res = await request(app)
      .post(`/v1/reports/${sales1Report1Id}/comment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ comment: '重複コメント' })

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('DUPLICATE_ENTRY')
    expect(res.body.error.message).toBe('この日報にはすでにコメントが存在します')
  })

  it('adminが任意の日報にコメントを投稿できる', async () => {
    const adminReportId = await createReport(employees.adminId, customers.customer1Id, pastDate(3))
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .post(`/v1/reports/${adminReportId}/comment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ comment: '管理者からのコメント' })

    expect(res.status).toBe(201)
    expect(res.body.data.comment).toBe('管理者からのコメント')
  })

  it('コメント本文が空で400が返る', async () => {
    const token = await getToken('manager@example.com')
    const emptyCommentReportId = await createReport(
      employees.sales2Id,
      customers.customer1Id,
      pastDate(4),
    )
    const res = await request(app)
      .post(`/v1/reports/${emptyCommentReportId}/comment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ comment: '' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('コメント本文なしで400が返る', async () => {
    const token = await getToken('manager@example.com')
    const noBodyReportId = await createReport(
      employees.sales2Id,
      customers.customer2Id,
      pastDate(5),
    )
    const res = await request(app)
      .post(`/v1/reports/${noBodyReportId}/comment`)
      .set('Authorization', `Bearer ${token}`)
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('存在しない日報IDで404が返る', async () => {
    const token = await getToken('manager@example.com')
    const res = await request(app)
      .post('/v1/reports/99999/comment')
      .set('Authorization', `Bearer ${token}`)
      .send({ comment: 'コメント' })

    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  it('トークンなしで401が返る', async () => {
    const res = await request(app)
      .post(`/v1/reports/${sales1Report2Id}/comment`)
      .send({ comment: 'コメント' })

    expect(res.status).toBe(401)
  })
})
