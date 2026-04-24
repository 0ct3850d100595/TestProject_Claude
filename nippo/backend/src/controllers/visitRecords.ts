import { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { visitRecordSchema } from '../validators/visitRecords.js'

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

function parsePositiveInt(value: string): number | null {
  const n = parseInt(value, 10)
  return isNaN(n) || n <= 0 ? null : n
}

const VISIT_RECORD_INCLUDE = {
  customer: { select: { id: true, companyName: true, contactName: true } },
} as const

function formatVisitRecord(vr: {
  id: number
  sortOrder: number
  visitContent: string
  customer: { id: number; companyName: string; contactName: string }
}) {
  return {
    id: vr.id,
    sort_order: vr.sortOrder,
    customer: {
      id: vr.customer.id,
      company_name: vr.customer.companyName,
      contact_name: vr.customer.contactName,
    },
    visit_content: vr.visitContent,
  }
}

async function findReport(reportId: number) {
  return prisma.dailyReport.findUnique({
    where: { id: reportId },
    select: { id: true, employeeId: true },
  })
}

export async function addVisitRecord(req: Request, res: Response): Promise<void> {
  const reportId = parsePositiveInt(String(req.params.report_id))
  if (!reportId) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '日報が見つかりません' },
    })
    return
  }

  const result = visitRecordSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json(
      validationErrorResponse(
        result.error.errors.map((e) => ({ field: String(e.path[0] ?? ''), message: e.message })),
      ),
    )
    return
  }

  const { id: userId } = req.user

  const report = await findReport(reportId)
  if (!report) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '日報が見つかりません' },
    })
    return
  }
  if (report.employeeId !== userId) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'この操作を行う権限がありません' },
    })
    return
  }

  const { customer_id, visit_content, sort_order } = result.data

  const customer = await prisma.customer.findFirst({
    where: { id: customer_id, deletedAt: null },
    select: { id: true },
  })
  if (!customer) {
    res.status(400).json(
      validationErrorResponse([{ field: 'customer_id', message: '存在しない顧客IDです' }]),
    )
    return
  }

  const visitRecord = await prisma.visitRecord.create({
    data: {
      dailyReportId: reportId,
      customerId: customer_id,
      visitContent: visit_content,
      sortOrder: sort_order,
    },
    include: VISIT_RECORD_INCLUDE,
  })

  res.status(201).json({ success: true, data: formatVisitRecord(visitRecord) })
}

export async function updateVisitRecord(req: Request, res: Response): Promise<void> {
  const reportId = parsePositiveInt(String(req.params.report_id))
  const visitId = parsePositiveInt(String(req.params.id))
  if (!reportId || !visitId) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '訪問記録が見つかりません' },
    })
    return
  }

  const result = visitRecordSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json(
      validationErrorResponse(
        result.error.errors.map((e) => ({ field: String(e.path[0] ?? ''), message: e.message })),
      ),
    )
    return
  }

  const { id: userId } = req.user

  const report = await findReport(reportId)
  if (!report) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '日報が見つかりません' },
    })
    return
  }
  if (report.employeeId !== userId) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'この操作を行う権限がありません' },
    })
    return
  }

  const existing = await prisma.visitRecord.findFirst({
    where: { id: visitId, dailyReportId: reportId },
    select: { id: true },
  })
  if (!existing) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '訪問記録が見つかりません' },
    })
    return
  }

  const { customer_id, visit_content, sort_order } = result.data

  const customer = await prisma.customer.findFirst({
    where: { id: customer_id, deletedAt: null },
    select: { id: true },
  })
  if (!customer) {
    res.status(400).json(
      validationErrorResponse([{ field: 'customer_id', message: '存在しない顧客IDです' }]),
    )
    return
  }

  const visitRecord = await prisma.visitRecord.update({
    where: { id: visitId },
    data: {
      customerId: customer_id,
      visitContent: visit_content,
      sortOrder: sort_order,
    },
    include: VISIT_RECORD_INCLUDE,
  })

  res.status(200).json({ success: true, data: formatVisitRecord(visitRecord) })
}

export async function deleteVisitRecord(req: Request, res: Response): Promise<void> {
  const reportId = parsePositiveInt(String(req.params.report_id))
  const visitId = parsePositiveInt(String(req.params.id))
  if (!reportId || !visitId) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '訪問記録が見つかりません' },
    })
    return
  }

  const { id: userId } = req.user

  const report = await findReport(reportId)
  if (!report) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '日報が見つかりません' },
    })
    return
  }
  if (report.employeeId !== userId) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'この操作を行う権限がありません' },
    })
    return
  }

  const existing = await prisma.visitRecord.findFirst({
    where: { id: visitId, dailyReportId: reportId },
    select: { id: true },
  })
  if (!existing) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '訪問記録が見つかりません' },
    })
    return
  }

  // delete first then count within a transaction to prevent TOCTOU race
  class LastRecordError extends Error {}
  try {
    await prisma.$transaction(async (tx) => {
      await tx.visitRecord.delete({ where: { id: visitId } })
      const remaining = await tx.visitRecord.count({ where: { dailyReportId: reportId } })
      if (remaining === 0) throw new LastRecordError()
    })
  } catch (err) {
    if (err instanceof LastRecordError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '訪問記録が1件のみの場合は削除できません',
        },
      })
      return
    }
    throw err
  }

  res.status(200).json({ success: true, data: null })
}
