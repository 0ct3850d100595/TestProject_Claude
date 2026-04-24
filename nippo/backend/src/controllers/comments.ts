import { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { commentSchema } from '../validators/comments.js'

function parsePositiveInt(value: string): number | null {
  const n = parseInt(value, 10)
  return isNaN(n) || n <= 0 ? null : n
}

export async function postComment(req: Request, res: Response): Promise<void> {
  const reportId = parsePositiveInt(String(req.params.report_id))
  if (!reportId) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '日報が見つかりません' },
    })
    return
  }

  const { id: userId, role } = req.user

  if (role === 'sales') {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'この操作を行う権限がありません' },
    })
    return
  }

  const result = commentSchema.safeParse(req.body)
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

  const report = await prisma.dailyReport.findUnique({
    where: { id: reportId },
    select: { id: true, employeeId: true },
  })
  if (!report) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '日報が見つかりません' },
    })
    return
  }

  if (role === 'manager') {
    const reportOwner = await prisma.employee.findUnique({
      where: { id: report.employeeId },
      select: { managerId: true },
    })
    if (!reportOwner || reportOwner.managerId !== userId) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'この操作を行う権限がありません' },
      })
      return
    }
  }

  const existing = await prisma.managerComment.findUnique({
    where: { dailyReportId: reportId },
    select: { id: true },
  })
  if (existing) {
    res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE_ENTRY', message: 'この日報にはすでにコメントが存在します' },
    })
    return
  }

  const created = await prisma.managerComment.create({
    data: {
      dailyReportId: reportId,
      managerId: userId,
      comment: result.data.comment,
    },
    include: {
      manager: { select: { id: true, name: true } },
    },
  })

  res.status(201).json({
    success: true,
    data: {
      id: created.id,
      comment: created.comment,
      manager: { id: created.manager.id, name: created.manager.name },
      commented_at: created.commentedAt,
    },
  })
}
