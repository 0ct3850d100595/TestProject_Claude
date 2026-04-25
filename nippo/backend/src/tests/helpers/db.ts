import bcrypt from 'bcrypt'
import { prisma } from '../../lib/prisma.js'

export const TEST_PASSWORD = 'Test1234!'
const BCRYPT_ROUNDS = 1

export async function resetDatabase(): Promise<void> {
  await prisma.managerComment.deleteMany()
  await prisma.visitRecord.deleteMany()
  await prisma.dailyReport.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.employee.deleteMany()
}

export function pastDate(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

export function futureDate(daysAhead: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().split('T')[0]
}

export interface SeededEmployees {
  adminId: number
  managerId: number
  sales1Id: number
  sales2Id: number
  otherId: number
}

export async function seedEmployees(): Promise<SeededEmployees> {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, BCRYPT_ROUNDS)

  const admin = await prisma.employee.create({
    data: { name: '管理者 太郎', email: 'admin@example.com', passwordHash, role: 'admin' },
  })
  const manager = await prisma.employee.create({
    data: { name: '部長 花子', email: 'manager@example.com', passwordHash, role: 'manager' },
  })
  const sales1 = await prisma.employee.create({
    data: {
      name: '営業 一郎',
      email: 'sales1@example.com',
      passwordHash,
      role: 'sales',
      managerId: manager.id,
    },
  })
  const sales2 = await prisma.employee.create({
    data: {
      name: '営業 二郎',
      email: 'sales2@example.com',
      passwordHash,
      role: 'sales',
      managerId: manager.id,
    },
  })
  const other = await prisma.employee.create({
    data: { name: '他部署 三郎', email: 'other@example.com', passwordHash, role: 'sales' },
  })

  return {
    adminId: admin.id,
    managerId: manager.id,
    sales1Id: sales1.id,
    sales2Id: sales2.id,
    otherId: other.id,
  }
}

export interface SeededCustomers {
  customer1Id: number
  customer2Id: number
  customer3Id: number
}

export async function seedCustomers(): Promise<SeededCustomers> {
  const c1 = await prisma.customer.create({
    data: {
      companyName: '株式会社テスト商事',
      contactName: '田中 一郎',
      phone: '03-1111-2222',
      email: 'tanaka@test.co.jp',
    },
  })
  const c2 = await prisma.customer.create({
    data: {
      companyName: '△△工業株式会社',
      contactName: '鈴木 二郎',
      phone: '06-3333-4444',
      email: 'suzuki@delta.co.jp',
    },
  })
  const c3 = await prisma.customer.create({
    data: { companyName: '◇◇システムズ', contactName: '高橋 三郎', phone: '052-5555-6666' },
  })

  return { customer1Id: c1.id, customer2Id: c2.id, customer3Id: c3.id }
}

export async function createReport(
  employeeId: number,
  customerId: number,
  reportDate: string,
  opts?: { problem?: string; plan?: string },
): Promise<number> {
  const report = await prisma.dailyReport.create({
    data: {
      employeeId,
      reportDate: new Date(reportDate),
      problem: opts?.problem ?? null,
      plan: opts?.plan ?? null,
      visitRecords: {
        create: [{ customerId, visitContent: 'テスト訪問内容', sortOrder: 1 }],
      },
    },
  })
  return report.id
}

export async function createComment(
  dailyReportId: number,
  managerId: number,
  comment: string,
): Promise<number> {
  const c = await prisma.managerComment.create({
    data: { dailyReportId, managerId, comment },
  })
  return c.id
}
