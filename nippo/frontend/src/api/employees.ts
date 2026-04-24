import apiClient from './client'
import type { Employee, ApiList, ApiItem, Role } from './types'

export interface EmployeeListParams {
  page?: number
  per_page?: number
  role?: Role
}

export async function listEmployees(params: EmployeeListParams = {}): Promise<ApiList<Employee>> {
  const res = await apiClient.get<ApiList<Employee>>('/employees', { params })
  return res.data
}

export async function getEmployee(id: number): Promise<Employee> {
  const res = await apiClient.get<ApiItem<Employee>>(`/employees/${id}`)
  return res.data.data
}

export interface CreateEmployeeInput {
  name: string
  email: string
  password: string
  role: Role
  manager_id?: number | null
}

export interface UpdateEmployeeInput {
  name: string
  email: string
  password?: string
  role: Role
  manager_id?: number | null
}

export async function createEmployee(input: CreateEmployeeInput): Promise<Employee> {
  const res = await apiClient.post<ApiItem<Employee>>('/employees', input)
  return res.data.data
}

export async function updateEmployee(id: number, input: UpdateEmployeeInput): Promise<Employee> {
  const res = await apiClient.put<ApiItem<Employee>>(`/employees/${id}`, input)
  return res.data.data
}

export async function deleteEmployee(id: number): Promise<void> {
  await apiClient.delete(`/employees/${id}`)
}
