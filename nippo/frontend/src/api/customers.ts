import apiClient from './client'
import type { Customer, ApiList, ApiItem } from './types'

export interface CustomerListParams {
  page?: number
  per_page?: number
  keyword?: string
  sort?: 'company_name' | 'contact_name'
  order?: 'asc' | 'desc'
}

export async function listCustomers(params: CustomerListParams = {}): Promise<ApiList<Customer>> {
  const res = await apiClient.get<ApiList<Customer>>('/customers', { params })
  return res.data
}

export async function getCustomer(id: number): Promise<Customer> {
  const res = await apiClient.get<ApiItem<Customer>>(`/customers/${id}`)
  return res.data.data
}

export interface CustomerInput {
  company_name: string
  contact_name: string
  phone?: string | null
  email?: string | null
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const res = await apiClient.post<ApiItem<Customer>>('/customers', input)
  return res.data.data
}

export async function updateCustomer(id: number, input: CustomerInput): Promise<Customer> {
  const res = await apiClient.put<ApiItem<Customer>>(`/customers/${id}`, input)
  return res.data.data
}

export async function deleteCustomer(id: number): Promise<void> {
  await apiClient.delete(`/customers/${id}`)
}
