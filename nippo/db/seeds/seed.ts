import 'dotenv/config'
import { PrismaClient, Role } from '../../backend/src/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcrypt'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function findOrCreateCustomer(data: {
  companyName: string
  contactName: string
  phone: string | null
  email: string | null
}) {
  return (
    (await prisma.customer.findFirst({ where: { companyName: data.companyName } })) ??
    (await prisma.customer.create({ data }))
  )
}

async function main() {
  const SALT_ROUNDS = 10
  const DEFAULT_PASSWORD = 'password123'
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS)

  // 管理者
  const admin = await prisma.employee.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: '管理者 太郎',
      email: 'admin@example.com',
      passwordHash: hash,
      role: Role.admin,
    },
  })

  // 上長
  const manager = await prisma.employee.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      name: '上長 花子',
      email: 'manager@example.com',
      passwordHash: hash,
      role: Role.manager,
    },
  })

  // 営業担当1
  const sales1 = await prisma.employee.upsert({
    where: { email: 'sales1@example.com' },
    update: {},
    create: {
      name: '営業 一郎',
      email: 'sales1@example.com',
      passwordHash: hash,
      role: Role.sales,
      managerId: manager.id,
    },
  })

  // 営業担当2
  const sales2 = await prisma.employee.upsert({
    where: { email: 'sales2@example.com' },
    update: {},
    create: {
      name: '営業 二郎',
      email: 'sales2@example.com',
      passwordHash: hash,
      role: Role.sales,
      managerId: manager.id,
    },
  })

  // 顧客マスタ（company_name で検索して存在しなければ作成）
  const customer1 = await findOrCreateCustomer({
    companyName: '株式会社サンプル商事',
    contactName: '山田 太郎',
    phone: '03-1234-5678',
    email: 'yamada@sample.co.jp',
  })

  const customer2 = await findOrCreateCustomer({
    companyName: 'テスト工業株式会社',
    contactName: '鈴木 次郎',
    phone: '06-9876-5432',
    email: 'suzuki@test-industry.co.jp',
  })

  const customer3 = await findOrCreateCustomer({
    companyName: 'デモ株式会社',
    contactName: '佐藤 三郎',
    phone: null,
    email: null,
  })

  // 日報（sales1）
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const report1 = await prisma.dailyReport.upsert({
    where: { idx_reports_employee_date: { employeeId: sales1.id, reportDate: today } },
    update: {},
    create: {
      employeeId: sales1.id,
      reportDate: today,
      problem: '顧客Aの予算承認が遅れています。来週中に確認が必要です。',
      plan: '明日はテスト工業の担当者と打ち合わせを行い、提案書を提出する。',
      visitRecords: {
        create: [
          {
            customerId: customer1.id,
            visitContent: '新製品のデモ実施。担当者の反応は良好で、来週に詳細提案の機会をいただいた。',
            sortOrder: 1,
          },
          {
            customerId: customer2.id,
            visitContent: '定期訪問。現状の課題ヒアリングを行い、改善提案を検討中。',
            sortOrder: 2,
          },
        ],
      },
    },
  })

  const report2 = await prisma.dailyReport.upsert({
    where: { idx_reports_employee_date: { employeeId: sales1.id, reportDate: yesterday } },
    update: {},
    create: {
      employeeId: sales1.id,
      reportDate: yesterday,
      problem: '特になし',
      plan: '株式会社サンプル商事への訪問準備を進める。',
      visitRecords: {
        create: [
          {
            customerId: customer3.id,
            visitContent: '初回訪問。会社概要の説明と現在の課題についてヒアリングを実施。',
            sortOrder: 1,
          },
        ],
      },
    },
  })

  // 上長コメント（report2 に対して）
  await prisma.managerComment.upsert({
    where: { dailyReportId: report2.id },
    update: {},
    create: {
      dailyReportId: report2.id,
      managerId: manager.id,
      comment: 'デモ株式会社への初回訪問お疲れ様です。次回はより具体的なニーズを引き出せるよう、事前の質問リストを準備してみてください。',
    },
  })

  console.log('Seed completed:')
  console.log(`  admin: ${admin.email}`)
  console.log(`  manager: ${manager.email}`)
  console.log(`  sales1: ${sales1.email}`)
  console.log(`  sales2: ${sales2.email}`)
  console.log(`  customers: ${customer1.companyName}, ${customer2.companyName}, ${customer3.companyName}`)
  console.log(`  daily reports: ${report1.id}, ${report2.id}`)
  console.log('All passwords: password123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
