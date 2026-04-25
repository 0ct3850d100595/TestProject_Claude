import axios, { isAxiosError } from 'axios'
import { useAuthStore } from '../store/authStore'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/v1',
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (error: unknown) => {
    if (isAxiosError(error) && error.response?.status === 401) {
      const url = error.config?.url ?? ''
      if (!url.includes('/auth/login')) {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default apiClient
