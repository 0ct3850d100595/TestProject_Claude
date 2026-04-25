import pg from 'pg'
import bcrypt from 'bcrypt'

const { Client } = pg

export const E2E_DB_URL =
  process.env.E2E_DATABASE_URL ??
  'postgresql://nippo:nippo_password@localhost:5432/nippo_db'

export const E2E_USERS = {
  admin:   { email: 'e2e-admin@nippo.test',   password: 'E2eAdmin99!',   name: 'E2E管理者' },
  manager: { email: 'e2e-manager@nippo.test', password: 'E2eManager99!', name: 'E2E部長' },
  sales:   { email: 'e2e-sales@nippo.test',   password: 'E2eSales99!',   name: 'E2E営業' },
  other:   { email: 'e2e-other@nippo.test',   password: 'E2eOther99!',   name: 'E2E他部署' },
} as const

export const E2E_CUSTOMER_NAME = 'E2Eテスト商事'

export default async function globalSetup() {
  const client = new Client({ connectionString: E2E_DB_URL })
  await client.connect()

  try {
    // E2E専用データのみ削除（@nippo.test ドメインのみ）
    await client.query(`
      DELETE FROM manager_comments
      WHERE daily_report_id IN (
        SELECT dr.id FROM daily_reports dr
        JOIN employees e ON dr.employee_id = e.id
        WHERE e.email LIKE '%@nippo.test'
      )
    `)
    await client.query(`
      DELETE FROM visit_records
      WHERE daily_report_id IN (
        SELECT dr.id FROM daily_reports dr
        JOIN employees e ON dr.employee_id = e.id
        WHERE e.email LIKE '%@nippo.test'
      )
    `)
    await client.query(`
      DELETE FROM daily_reports
      WHERE employee_id IN (
        SELECT id FROM employees WHERE email LIKE '%@nippo.test'
      )
    `)
    await client.query(`
      UPDATE employees SET manager_id = NULL WHERE email LIKE '%@nippo.test'
    `)
    await client.query(`DELETE FROM employees WHERE email LIKE '%@nippo.test'`)
    await client.query(`
      DELETE FROM customers WHERE company_name = $1
    `, [E2E_CUSTOMER_NAME])

    // 社員を作成
    const hash = (pw: string) => bcrypt.hash(pw, 10)
    const [adminHash, managerHash, salesHash, otherHash] = await Promise.all([
      hash(E2E_USERS.admin.password),
      hash(E2E_USERS.manager.password),
      hash(E2E_USERS.sales.password),
      hash(E2E_USERS.other.password),
    ])

    const adminRes = await client.query(
      `INSERT INTO employees (name, email, password_hash, role, updated_at) VALUES ($1, $2, $3, 'admin', NOW()) RETURNING id`,
      [E2E_USERS.admin.name, E2E_USERS.admin.email, adminHash],
    )
    const managerRes = await client.query(
      `INSERT INTO employees (name, email, password_hash, role, updated_at) VALUES ($1, $2, $3, 'manager', NOW()) RETURNING id`,
      [E2E_USERS.manager.name, E2E_USERS.manager.email, managerHash],
    )
    const managerId: number = managerRes.rows[0].id

    const salesRes = await client.query(
      `INSERT INTO employees (name, email, password_hash, role, manager_id, updated_at) VALUES ($1, $2, $3, 'sales', $4, NOW()) RETURNING id`,
      [E2E_USERS.sales.name, E2E_USERS.sales.email, salesHash, managerId],
    )
    await client.query(
      `INSERT INTO employees (name, email, password_hash, role, updated_at) VALUES ($1, $2, $3, 'sales', NOW()) RETURNING id`,
      [E2E_USERS.other.name, E2E_USERS.other.email, otherHash],
    )

    const salesId: number = salesRes.rows[0].id

    // テスト用顧客を作成
    const custRes = await client.query(
      `INSERT INTO customers (company_name, contact_name, updated_at) VALUES ($1, '担当 太郎', NOW()) RETURNING id`,
      [E2E_CUSTOMER_NAME],
    )
    const customerId: number = custRes.rows[0].id

    // managerがコメントするための sales の日報を作成（昨日）
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const reportDate = yesterday.toISOString().split('T')[0]

    const reportRes = await client.query(
      `INSERT INTO daily_reports (employee_id, report_date, problem, plan, updated_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
      [salesId, reportDate, 'テスト課題', 'テスト計画'],
    )
    const reportId: number = reportRes.rows[0].id

    await client.query(
      `INSERT INTO visit_records (daily_report_id, customer_id, visit_content, sort_order, updated_at)
       VALUES ($1, $2, '商談を実施しました', 1, NOW())`,
      [reportId, customerId],
    )

    // 環境変数経由でテストにIDを渡す
    process.env.E2E_REPORT_ID = String(reportId)
    process.env.E2E_CUSTOMER_ID = String(customerId)
    process.env.E2E_MANAGER_ID = String(managerId)
    process.env.E2E_SALES_ID = String(salesId)
    process.env.E2E_ADMIN_ID = String(adminRes.rows[0].id)

    console.log('[E2E setup] Test data created successfully')
    console.log(`  reportId=${reportId}, customerId=${customerId}, managerId=${managerId}, salesId=${salesId}`)
  } finally {
    await client.end()
  }

  // ブラウザーを使った storageState の事前生成は不要（各テストで直接ログイン）
  // グローバルセットアップ完了
}
