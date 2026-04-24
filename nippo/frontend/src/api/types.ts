export type Role = 'sales' | 'manager' | 'admin'

export interface AuthEmployee {
  id: number
  name: string
  email: string
  role: Role
  manager_id: number | null
}

export interface Customer {
  id: number
  company_name: string
  contact_name: string
  phone: string | null
  email: string | null
  created_at: string
  updated_at: string
}

export interface VisitRecord {
  id: number
  sort_order: number
  customer: { id: number; company_name: string; contact_name: string }
  visit_content: string
}

export interface ManagerComment {
  id: number
  comment: string
  manager: { id: number; name: string }
  commented_at: string
}

export interface Report {
  id: number
  report_date: string
  employee: { id: number; name: string }
  problem: string | null
  plan: string | null
  visit_records: VisitRecord[]
  manager_comment: ManagerComment | null
  created_at: string
  updated_at: string
}

export interface ReportListItem {
  id: number
  report_date: string
  employee: { id: number; name: string }
  visit_count: number
  has_comment: boolean
  created_at: string
  updated_at: string
}

export interface Employee {
  id: number
  name: string
  email: string
  role: Role
  manager_id: number | null
  manager: { id: number; name: string } | null
  created_at: string
  updated_at: string
}

export interface Meta {
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface ApiList<T> {
  success: true
  data: T[]
  meta: Meta
}

export interface ApiItem<T> {
  success: true
  data: T
}
