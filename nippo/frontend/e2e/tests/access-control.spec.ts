import { test, expect, loginAs } from '../fixtures.js'

test.describe('権限制御フロー', () => {
  test('salesロールで顧客マスタの「新規登録」ボタンが表示されない', async ({ page }) => {
    await loginAs(page, 'sales')
    await page.goto('/customers')

    await expect(page.getByRole('heading').first()).toBeVisible()
    // 新規登録ボタンが存在しない
    await expect(page.getByRole('link', { name: /新規登録/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /新規登録/ })).toHaveCount(0)
  })

  test('salesロールで /employees にアクセスするとダッシュボードにリダイレクトされる', async ({ page }) => {
    await loginAs(page, 'sales')
    await page.goto('/employees')

    // PrivateRoute により /dashboard にリダイレクト
    await expect(page).toHaveURL('/dashboard')
  })

  test('salesロールのサイドナビに「社員マスタ」が表示されない', async ({ page }) => {
    await loginAs(page, 'sales')
    await page.goto('/dashboard')

    await expect(page.locator('.sidebar')).toBeVisible()
    await expect(page.getByRole('link', { name: '社員マスタ' })).toHaveCount(0)
  })

  test('adminロールのサイドナビに「社員マスタ」が表示される', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/dashboard')

    await expect(page.getByRole('link', { name: '社員マスタ' })).toBeVisible()
  })

  test('managerロールで顧客マスタの「新規登録」ボタンが表示される', async ({ page }) => {
    await loginAs(page, 'manager')
    await page.goto('/customers')

    await expect(
      page.getByRole('link', { name: /新規登録/ }).or(page.getByRole('button', { name: /新規登録/ }))
    ).toBeVisible()
  })

  test('managerロールで /employees にアクセスするとダッシュボードにリダイレクトされる', async ({ page }) => {
    await loginAs(page, 'manager')
    await page.goto('/employees')

    await expect(page).toHaveURL('/dashboard')
  })
})
