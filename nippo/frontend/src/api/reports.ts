import apiClient from './client'
import type { Report, ReportListItem, ApiList, ApiItem } from './types'

export interface ReportListParams {
  page?: number
  per_page?: number
  employee_id?: number
  date_from?: string
  date_to?: string
  sort?: 'report_date' | 'employee_name'
  order?: 'asc' | 'desc'
}

export async function listReports(params: ReportListParams = {}): Promise<ApiList<ReportListItem>> {
  const res = await apiClient.get<ApiList<ReportListItem>>('/reports', { params })
  return res.data
}

export async function getReport(id: number): Promise<Report> {
  const res = await apiClient.get<ApiItem<Report>>(`/reports/${id}`)
  return res.data.data
}

export interface VisitRecordInput {
  customer_id: number
  visit_content: string
  sort_order: number
}

export interface CreateReportInput {
  report_date: string
  problem?: string
  plan?: string
  visit_records: VisitRecordInput[]
}

export async function createReport(input: CreateReportInput): Promise<Report> {
  const res = await apiClient.post<ApiItem<Report>>('/reports', input)
  return res.data.data
}

export async function updateReport(id: number, input: CreateReportInput): Promise<Report> {
  const res = await apiClient.put<ApiItem<Report>>(`/reports/${id}`, input)
  return res.data.data
}

export async function deleteReport(id: number): Promise<void> {
  await apiClient.delete(`/reports/${id}`)
}

export async function postComment(reportId: number, comment: string): Promise<void> {
  await apiClient.post(`/reports/${reportId}/comment`, { comment })
}
