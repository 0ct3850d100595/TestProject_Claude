import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthEmployee } from '../api/types'

interface AuthState {
  token: string | null
  employee: AuthEmployee | null
  login: (token: string, employee: AuthEmployee) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      employee: null,
      login: (token, employee) => set({ token, employee }),
      logout: () => set({ token: null, employee: null }),
    }),
    { name: 'nippo-auth' },
  ),
)
