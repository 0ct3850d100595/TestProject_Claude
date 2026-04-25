import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import {
  resetDatabase,
  seedEmployees,
  TEST_PASSWORD,
  type SeededEmployees,
} from './helpers/db.js'

let employees: SeededEmployees

async function getToken(email: string, password = TEST_PASSWORD): Promise<string> {
  const res = await request(app).post('/v1/auth/login').send({ email, password })
  return res.body.data.token as string
}

beforeAll(async () => {
  await resetDatabase()
  employees = await seedEmployees()
})

describe('GET /v1/employees - 社員一覧', () => {
  it('adminが社員一覧を取得できる（5件）', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .get('/v1/employees')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.meta.total).toBe(5)
    const emails = (res.body.data as Array<{ email: string }>).map((e) => e.email)
    expect(emails).toContain('admin@example.com')
    expect(emails).toContain('manager@example.com')
    expect(emails).toContain('sales1@example.com')
  })

  it('salesが社員一覧にアクセスすると403が返る', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .get('/v1/employees')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('managerが社員一覧にアクセスすると自分の部下のみ取得できる', async () => {
    const token = await getToken('manager@example.com')
    const res = await request(app)
      .get('/v1/employees')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.meta.total).toBe(2)
    const emails = (res.body.data as Array<{ email: string }>).map((e) => e.email)
    expect(emails).toContain('sales1@example.com')
    expect(emails).toContain('sales2@example.com')
    expect(emails).not.toContain('manager@example.com')
    expect(emails).not.toContain('admin@example.com')
  })

  it('ロールフィルターで社員を絞り込める', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .get('/v1/employees?role=sales')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    const roles = (res.body.data as Array<{ role: string }>).map((e) => e.role)
    expect(roles.every((r) => r === 'sales')).toBe(true)
  })
})

describe('GET /v1/employees/:id - 社員詳細', () => {
  it('adminが任意の社員詳細を取得できる', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .get(`/v1/employees/${employees.sales1Id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.email).toBe('sales1@example.com')
    expect(res.body.data.role).toBe('sales')
    expect(res.body.data.manager.id).toBe(employees.managerId)
  })

  it('salesが自分自身の詳細を取得できる', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .get(`/v1/employees/${employees.sales1Id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.email).toBe('sales1@example.com')
  })

  it('salesが他の社員の詳細を取得しようとすると403が返る', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .get(`/v1/employees/${employees.sales2Id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('存在しない社員IDで404が返る', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .get('/v1/employees/99999')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })
})

describe('POST /v1/employees - 社員登録', () => {
  it('adminが社員を正常に登録できる（201）', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .post('/v1/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '新規 営業',
        email: 'newstaff@example.com',
        password: 'NewPass1234!',
        role: 'sales',
        manager_id: employees.managerId,
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.email).toBe('newstaff@example.com')
    expect(res.body.data.role).toBe('sales')
    expect(res.body.data.manager.id).toBe(employees.managerId)
  })

  it('salesが社員登録を試みると403が返る', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .post('/v1/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '不正登録',
        email: 'unauthorized@example.com',
        password: 'Password123!',
        role: 'sales',
      })

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('重複メールアドレスで社員登録すると409が返る', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .post('/v1/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '重複テスト',
        email: 'sales1@example.com', // 既存のメール
        password: 'Password123!',
        role: 'sales',
      })

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('DUPLICATE_ENTRY')
    expect(res.body.error.message).toBe('このメールアドレスはすでに使用されています')
  })

  it('パスワードが7文字でバリデーションエラーが返る（境界値）', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .post('/v1/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'テスト社員',
        email: 'shortpw@example.com',
        password: '1234567', // 7文字
        role: 'sales',
      })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    const fields = (res.body.error.details as Array<{ field: string }>).map((d) => d.field)
    expect(fields).toContain('password')
  })

  it('パスワードが8文字で正常に登録できる（境界値）', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .post('/v1/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'テスト社員8文字PW',
        email: 'pw8chars@example.com',
        password: '12345678', // 8文字
        role: 'sales',
      })

    expect(res.status).toBe(201)
  })

  it('managerロールで登録するとmanager_idはnullになる', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .post('/v1/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '新規マネージャー',
        email: 'newmanager@example.com',
        password: 'Password123!',
        role: 'manager',
        manager_id: employees.managerId, // managerロールでは無視される
      })

    expect(res.status).toBe(201)
    expect(res.body.data.manager_id).toBeNull()
  })
})

describe('PUT /v1/employees/:id - 社員更新', () => {
  it('adminが社員のロールを変更できる', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .put(`/v1/employees/${employees.sales2Id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '営業 二郎',
        email: 'sales2@example.com',
        role: 'manager',
      })

    expect(res.status).toBe(200)
    expect(res.body.data.role).toBe('manager')
    expect(res.body.data.manager_id).toBeNull()
  })

  it('他の社員と重複するメールアドレスで更新すると409が返る', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .put(`/v1/employees/${employees.sales1Id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '営業 一郎',
        email: 'admin@example.com', // adminのメールと重複
        role: 'sales',
      })

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('DUPLICATE_ENTRY')
  })

  it('salesが社員情報を更新しようとすると403が返る', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .put(`/v1/employees/${employees.sales1Id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '不正更新',
        email: 'sales1@example.com',
        role: 'sales',
      })

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('パスワードを変更すると新パスワードでログインでき、旧パスワードは無効になる（EMP-008）', async () => {
    const newPassword = 'NewSecurePass99!'

    // テスト専用社員を登録
    const createRes = await request(app)
      .post('/v1/employees')
      .set('Authorization', `Bearer ${await getToken('admin@example.com')}`)
      .send({
        name: 'パスワード変更テスト用',
        email: 'pwchange@example.com',
        password: TEST_PASSWORD,
        role: 'sales',
      })
    expect(createRes.status).toBe(201)
    const pwChangeEmpId = createRes.body.data.id as number

    // パスワードを変更
    const updateRes = await request(app)
      .put(`/v1/employees/${pwChangeEmpId}`)
      .set('Authorization', `Bearer ${await getToken('admin@example.com')}`)
      .send({
        name: 'パスワード変更テスト用',
        email: 'pwchange@example.com',
        role: 'sales',
        password: newPassword,
      })
    expect(updateRes.status).toBe(200)

    // 旧パスワードでログインできないことを確認
    const oldLoginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'pwchange@example.com', password: TEST_PASSWORD })
    expect(oldLoginRes.status).toBe(401)

    // 新パスワードでログインできることを確認
    const newLoginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'pwchange@example.com', password: newPassword })
    expect(newLoginRes.status).toBe(200)
    expect(newLoginRes.body.data.employee.email).toBe('pwchange@example.com')
  })
})

describe('DELETE /v1/employees/:id - 社員削除', () => {
  it('adminが自分自身を削除しようとすると400が返る', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .delete(`/v1/employees/${employees.adminId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.message).toBe('自分自身は削除できません')
  })

  it('salesが社員を削除しようとすると403が返る', async () => {
    const token = await getToken('sales1@example.com')
    const res = await request(app)
      .delete(`/v1/employees/${employees.otherId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('adminが社員を論理削除できる（200）', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .delete(`/v1/employees/${employees.otherId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toBeNull()
  })

  it('論理削除された社員でログインすると401が返る', async () => {
    // other@example.com は上のテストで削除済み
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'other@example.com', password: TEST_PASSWORD })

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
    expect(res.body.error.message).toBe('メールアドレスまたはパスワードが正しくありません')
  })

  it('論理削除された社員が一覧に含まれない', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .get('/v1/employees')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    const ids = (res.body.data as Array<{ id: number }>).map((e) => e.id)
    expect(ids).not.toContain(employees.otherId)
  })

  it('存在しない社員IDで削除すると404が返る', async () => {
    const token = await getToken('admin@example.com')
    const res = await request(app)
      .delete('/v1/employees/99999')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })
})
