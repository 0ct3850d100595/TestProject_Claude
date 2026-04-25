import { Request, Response } from 'express'
import { Prisma } from '../generated/prisma/client.js'
import { prisma } from '../lib/prisma.js'
import { listReportsSchema, createReportSchema, updateReportSchema } from '../validators/reports.js'

async function getVisibleEmployeeIds(userId: number): Promise<number[]> {
  const subordinates = await prisma.employee.findMany({
    where: { managerId: userId, deletedAt: null },
    select: { id: true },
  })
  return [userId, ...subordinates.map((s) => s.id)]
}

// Local date string in YYYY-MM-DD format (server local time)
function todayString(): string {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function validationErrorResponse(details: { field: string; message: string }[]) {
  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: '入力内容に誤りがあります',
      details,
    },
  }
}

// Shared interface for the full report response shape
interface ReportDetailResult {
  id: number
  reportDate: Date
  problem: string | null
  plan: string | null
  createdAt: Date
  updatedAt: Date
  employee: { id: number; name: string }
  visitRecords: {
    id: number
    sortOrder: number
    visitContent: string
    customer: { id: number; companyName: string; contactName: string }
  }[]
  managerComment: {
    id: number
    comment: string
    commentedAt: Date
    manager: { id: number; name: string }
  } | null
}

const REPORT_INCLUDE = {
  employee: { select: { id: true, name: true } },
  visitRecords: {
    include: {
      customer: { select: { id: true, companyName: true, contactName: true } },
    },
    orderBy: { sortOrder: 'asc' as const },
  },
  managerComment: {
    include: { manager: { select: { id: true, name: true } } },
  },
}

function formatReportDetail(report: ReportDetailResult) {
  return {
    id: report.id,
    report_date: report.reportDate.toISOString().split('T')[0],
    employee: report.employee,
    problem: report.problem,
    plan: report.plan,
    visit_records: report.visitRecords.map((vr) => ({
      id: vr.id,
      sort_order: vr.sortOrder,
      customer: {
        id: vr.customer.id,
        company_name: vr.customer.companyName,
        contact_name: vr.customer.contactName,
      },
      visit_content: vr.visitContent,
    })),
    manager_comment: report.managerComment
      ? {
          id: report.managerComment.id,
          comment: report.managerComment.comment,
          manager: report.managerComment.manager,
          commented_at: report.managerComment.commentedAt.toISOString(),
        }
      : null,
    created_at: report.createdAt.toISOString(),
    updated_at: report.updatedAt.toISOString(),
  }
}

export async function listReports(req: Request, res: Response): Promise<void> {
  const result = listReportsSchema.safeParse(req.query)
  if (!result.success) {
    res.status(400).json(validationErrorResponse(
      result.error.errors.map((e) => ({
        field: String(e.path[0] ?? ''),
        message: e.message,
      })),
    ))
    return
  }

  const { page, per_page, employee_id, date_from, date_to, sort, order } = result.data
  const { id: userId, role } = req.user

  const where: Prisma.DailyReportWhereInput = {}

  if (date_from || date_to) {
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (date_from) dateFilter.gte = new Date(date_from)
    if (date_to) dateFilter.lte = new Date(date_to)
    where.reportDate = dateFilter
  }

  if (role === 'sales') {
    where.employeeId = userId
  } else if (role === 'manager') {
    const visibleIds = await getVisibleEmployeeIds(userId)
    if (employee_id !== undefined) {
      // 範囲外の employee_id は結果ゼロとして扱う（403ではなく空リスト）
      where.employeeId = visibleIds.includes(employee_id) ? employee_id : -1
    } else {
      where.employeeId = { in: visibleIds }
    }
  } else {
    // admin
    if (employee_id !== undefined) where.employeeId = employee_id
  }

  const [total, reports] = await Promise.all([
    prisma.dailyReport.count({ where }),
    prisma.dailyReport.findMany({
      where,
      select: {
        id: true,
        reportDate: true,
        createdAt: true,
        updatedAt: true,
        employee: { select: { id: true, name: true } },
        _count: { select: { visitRecords: true } },
        managerComment: { select: { id: true } },
      },
      orderBy:
        sort === 'employee_name' ? { employee: { name: order } } : { reportDate: order },
      skip: (page - 1) * per_page,
      take: per_page,
    }),
  ])

  res.status(200).json({
    success: true,
    data: reports.map((r) => ({
      id: r.id,
      report_date: r.reportDate.toISOString().split('T')[0],
      employee: r.employee,
      visit_count: r._count.visitRecords,
      has_comment: r.managerComment !== null,
      created_at: r.createdAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
    })),
    meta: {
      total,
      page,
      per_page,
      total_pages: Math.ceil(total / per_page),
    },
  })
}

export async function getReport(req: Request, res: Response): Promise<void> {
  const reportId = parseInt(String(req.params.id), 10)
  if (isNaN(reportId) || reportId <= 0) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '日報が見つかりません' },
    })
    return
  }

  const { id: userId, role } = req.user

  const where: Prisma.DailyReportWhereInput = { id: reportId }
  if (role === 'sales') {
    where.employeeId = userId
  } else if (role === 'manager') {
    const visibleIds = await getVisibleEmployeeIds(userId)
    where.employeeId = { in: visibleIds }
  }
  // admin: 制限なし

  const report = await prisma.dailyReport.findFirst({ where, include: REPORT_INCLUDE })

  if (!report) {
    // admin は 404、それ以外はリソースの存在を漏らさないよう 403
    const isAdmin = role === 'admin'
    res.status(isAdmin ? 404 : 403).json({
      success: false,
      error: {
        code: isAdmin ? 'NOT_FOUND' : 'FORBIDDEN',
        message: isAdmin ? '日報が見つかりません' : 'この操作を行う権限がありません',
      },
    })
    return
  }

  res.status(200).json({ success: true, data: formatReportDetail(report) })
}

export async function createReport(req: Request, res: Response): Promise<void> {
  const result = createReportSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json(validationErrorResponse(
      result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    ))
    return
  }

  const { report_date, problem, plan, visit_records } = result.data
  const { id: userId } = req.user

  if (report_date > todayString()) {
    res.status(400).json(validationErrorResponse([
      { field: 'report_date', message: '未来の日付は指定できません' },
    ]))
    return
  }

  const customerIds = [...new Set(visit_records.map((vr) => vr.customer_id))]
  const foundCustomers = await prisma.customer.findMany({
    where: { id: { in: customerIds }, deletedAt: null },
    select: { id: true },
  })
  if (foundCustomers.length !== customerIds.length) {
    res.status(400).json(validationErrorResponse([
      { field: 'visit_records', message: '存在しない顧客IDが含まれています' },
    ]))
    return
  }

  let report: ReportDetailResult
  try {
    report = await prisma.dailyReport.create({
      data: {
        employeeId: userId,
        reportDate: new Date(report_date),
        problem: problem ?? null,
        plan: plan ?? null,
        visitRecords: {
          create: visit_records.map((vr) => ({
            customerId: vr.customer_id,
            visitContent: vr.visit_content,
            sortOrder: vr.sort_order,
          })),
        },
      },
      include: REPORT_INCLUDE,
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_ENTRY', message: '同一日付の日報が既に存在します' },
      })
      return
    }
    throw err
  }

  res.status(201).json({ success: true, data: formatReportDetail(report) })
}

export async function updateReport(req: Request, res: Response): Promise<void> {
  const reportId = parseInt(String(req.params.id), 10)
  if (isNaN(reportId) || reportId <= 0) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '日報が見つかりません' },
    })
    return
  }

  const result = updateReportSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json(validationErrorResponse(
      result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    ))
    return
  }

  const { report_date, problem, plan, visit_records } = result.data
  const { id: userId } = req.user

  const existing = await prisma.dailyReport.findUnique({
    where: { id: reportId },
    select: { id: true, employeeId: true },
  })
  if (!existing) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '日報が見つかりません' },
    })
    return
  }
  if (existing.employeeId !== userId) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'この操作を行う権限がありません' },
    })
    return
  }

  if (report_date > todayString()) {
    res.status(400).json(validationErrorResponse([
      { field: 'report_date', message: '未来の日付は指定できません' },
    ]))
    return
  }

  const customerIds = [...new Set(visit_records.map((vr) => vr.customer_id))]
  const foundCustomers = await prisma.customer.findMany({
    where: { id: { in: customerIds }, deletedAt: null },
    select: { id: true },
  })
  if (foundCustomers.length !== customerIds.length) {
    res.status(400).json(validationErrorResponse([
      { field: 'visit_records', message: '存在しない顧客IDが含まれています' },
    ]))
    return
  }

  let report: ReportDetailResult
  try {
    report = await prisma.$transaction(async (tx) => {
      await tx.visitRecord.deleteMany({ where: { dailyReportId: reportId } })
      return tx.dailyReport.update({
        where: { id: reportId },
        data: {
          reportDate: new Date(report_date),
          problem: problem ?? null,
          plan: plan ?? null,
          visitRecords: {
            create: visit_records.map((vr) => ({
              customerId: vr.customer_id,
              visitContent: vr.visit_content,
              sortOrder: vr.sort_order,
            })),
          },
        },
        include: REPORT_INCLUDE,
      })
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_ENTRY', message: '同一日付の日報が既に存在します' },
      })
      return
    }
    throw err
  }

  res.status(200).json({ success: true, data: formatReportDetail(report) })
}

export async function deleteReport(req: Request, res: Response): Promise<void> {
  const reportId = parseInt(String(req.params.id), 10)
  if (isNaN(reportId) || reportId <= 0) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '日報が見つかりません' },
    })
    return
  }

  const existing = await prisma.dailyReport.findUnique({
    where: { id: reportId },
    select: { id: true },
  })
  if (!existing) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '日報が見つかりません' },
    })
    return
  }

  await prisma.dailyReport.delete({ where: { id: reportId } })

  res.status(200).json({ success: true, data: null })
}
