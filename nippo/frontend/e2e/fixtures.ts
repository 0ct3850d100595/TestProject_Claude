import { test as base, type Page } from '@playwright/test'
import { E2E_USERS } from './global-setup.js'

type UserRole = keyof typeof E2E_USERS

export async function loginAs(page: Page, role: UserRole) {
  const user = E2E_USERS[role]
  await page.goto('/login')
  await page.getByRole('textbox', { name: /メールアドレス/ }).fill(user.email)
  await page.locator('input[type="password"]').fill(user.password)
  await page.getByRole('button', { name: 'ログイン' }).click()
  await page.waitForURL('/dashboard')
}

export function pastDate(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

export function futureDate(daysAhead: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().split('T')[0]
}

export const test = base
export { expect } from '@playwright/test'
