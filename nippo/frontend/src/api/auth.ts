import apiClient from './client'
import type { AuthEmployee } from './types'

export interface LoginResponse {
  token: string
  expires_at: string
  employee: AuthEmployee
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await apiClient.post<{ success: true; data: LoginResponse }>('/auth/login', { email, password })
  return res.data.data
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout')
}
