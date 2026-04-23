import { Request, Response } from 'express'
import type { Prisma } from '../generated/prisma/client.js'
import { prisma } from '../lib/prisma.js'
import { listReportsSchema } from '../validators/reports.js'

async function getVisibleEmployeeIds(userId: number): Promise<number[]> {
  const subordinates = await prisma.employee.findMany({
    where: { managerId: userId, deletedAt: null },
    select: { id: true },
  })
  return [userId, ...subordinates.map((s) => s.id)]
}

export async function listReports(req: Request, res: Response): Promise<void> {
  const result = listReportsSchema.safeParse(req.query)
  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '入力内容に誤りがあります',
        details: result.error.errors.map((e) => ({
          field: String(e.path[0] ?? ''),
          message: e.message,
        })),
      },
    })
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
  if (isNaN(reportId)) {
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

  const report = await prisma.dailyReport.findFirst({
    where,
    include: {
      employee: { select: { id: true, name: true } },
      visitRecords: {
        include: {
          customer: { select: { id: true, companyName: true, contactName: true } },
        },
        orderBy: { sortOrder: 'asc' },
      },
      managerComment: {
        include: { manager: { select: { id: true, name: true } } },
      },
    },
  })

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

  res.status(200).json({
    success: true,
    data: {
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
    },
  })
}
