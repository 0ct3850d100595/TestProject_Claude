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
import { prisma } from '../lib/prisma.js'

let employees: SeededEmployees
let customers: SeededCustomers
let reportId: number       // sales1の日報（訪問記録1件）
let twoRecordReportId: number // sales1の日報（訪問記録2件）
let visitRecord1Id: number   // twoRecordReportId の訪問記録1
let visitRecord2Id: number   // twoRecordReportId の訪問記録2

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

  // 訪問記録1件の日報
  reportId = await createReport(employees.sales1Id, customers.customer1Id, pastDate(1))

  // 訪問記録2件の日報（update/delete 操作に使用）
  const report = await prisma.dailyReport.create({
    data: {
      employeeId: employees.sales1Id,
      reportDate: new Date(pastDate(2)),
      visitRecords: {
        create: [
          { customerId: customers.customer1Id, visitContent: '訪問内容1', sortOrder: 1 },
          { customerId: customers.customer2Id, visitContent: '訪問内容2', sortOrder: 2 },
        ],
      },
    },
    include: { visitRecords: { orderBy: { sortOrder: 'asc' } } },
  })
  twoRecordReportId = report.id
  visitRecord1Id = report.visitRecords[0].id
  visitRecord2Id = report.visitRecords[1].id
})

describe('POST /v1/reports/:report_id/visit_records - 訪問記録追加', () => {
  it('作成者が訪問記録を追加できる（201）', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .post(`/v1/reports/${reportId}/visit_records`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer_id: customers.customer2Id,
        visit_content: '新規訪問内容',
        sort_order: 2,
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.visit_content).toBe('新規訪問内容')
    expect(res.body.data.sort_order).toBe(2)
    expect(res.body.data.customer.id).toBe(customers.customer2Id)
  })

  it('他人の日報に訪問記録を追加しようとすると403が返る', async () => {
    const token = await getToken('sales2@example.com')
    const res = await request(app)
      .post(`/v1/reports/${reportId}/visit_records`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer_id: customers.customer1Id,
        visit_content: '不正追加',
        sort_order: 1,
      })

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('存在しない顧客IDで訪問記録を追加しようとすると400が返る', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .post(`/v1/reports/${reportId}/visit_records`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer_id: 99999,
        visit_content: '訪問内容',
        sort_order: 3,
      })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('訪問内容が空で400が返る', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .post(`/v1/reports/${reportId}/visit_records`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer_id: customers.customer1Id,
        visit_content: '',
        sort_order: 1,
      })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('PUT /v1/reports/:report_id/visit_records/:id - 訪問記録更新', () => {
  it('作成者が訪問記録を更新できる（200）', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .put(`/v1/reports/${twoRecordReportId}/visit_records/${visitRecord1Id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer_id: customers.customer3Id,
        visit_content: '更新された訪問内容',
        sort_order: 1,
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.visit_content).toBe('更新された訪問内容')
    expect(res.body.data.customer.id).toBe(customers.customer3Id)
  })

  it('他人の日報の訪問記録を更新しようとすると403が返る', async () => {
    const token = await getToken('sales2@example.com')
    const res = await request(app)
      .put(`/v1/reports/${twoRecordReportId}/visit_records/${visitRecord1Id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer_id: customers.customer1Id,
        visit_content: '不正更新',
        sort_order: 1,
      })

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('存在しない訪問記録IDで404が返る', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .put(`/v1/reports/${twoRecordReportId}/visit_records/99999`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer_id: customers.customer1Id,
        visit_content: '更新内容',
        sort_order: 1,
      })

    expect(res.status).toBe(404)
  })
})

describe('DELETE /v1/reports/:report_id/visit_records/:id - 訪問記録削除', () => {
  it('訪問記録が2件以上の場合に1件削除できる（200）', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .delete(`/v1/reports/${twoRecordReportId}/visit_records/${visitRecord2Id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toBeNull()
  })

  it('訪問記録が1件のみの場合に削除しようとすると400が返る', async () => {
    const token = await getToken('sales1@example.com')
    // twoRecordReportId は上のテストで1件になっている（visitRecord1Id のみ残存）
    const res = await request(app)
      .delete(`/v1/reports/${twoRecordReportId}/visit_records/${visitRecord1Id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.message).toBe('訪問記録が1件のみの場合は削除できません')
  })

  it('他人の日報の訪問記録を削除しようとすると403が返る', async () => {
    const token = await getToken('sales2@example.com')
    // reportId は sales1 の日報
    const reportDetail = await prisma.dailyReport.findUnique({
      where: { id: reportId },
      include: { visitRecords: { orderBy: { id: 'asc' } } },
    })
    const visitId = reportDetail!.visitRecords[0].id

    const res = await request(app)
      .delete(`/v1/reports/${reportId}/visit_records/${visitId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })
})
