import { test, expect } from '../fixtures.js'
import { loginAs } from '../fixtures.js'

test.describe('認証フロー', () => {
  test('正しい認証情報でログイン → ダッシュボードに遷移する', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('textbox', { name: /メールアドレス/ }).fill('e2e-sales@nippo.test')
    await page.locator('input[type="password"]').fill('E2eSales99!')
    await page.getByRole('button', { name: 'ログイン' }).click()

    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText('E2E営業（営業担当）')).toBeVisible()
  })

  test('誤ったパスワードでエラーメッセージが表示される', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('textbox', { name: /メールアドレス/ }).fill('e2e-sales@nippo.test')
    await page.locator('input[type="password"]').fill('wrongpassword')
    await page.getByRole('button', { name: 'ログイン' }).click()

    await expect(page.locator('.alert-error')).toBeVisible()
    await expect(page.locator('.alert-error')).toContainText('メールアドレスまたはパスワードが正しくありません')
    await expect(page).toHaveURL('/login')
  })

  test('未ログイン状態で /dashboard にアクセスすると /login にリダイレクトされる', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
  })

  test('ログアウト後に保護ルートにアクセスするとリダイレクトされる', async ({ page }) => {
    await loginAs(page, 'sales')

    await page.getByRole('button', { name: 'ログアウト' }).click()
    await expect(page).toHaveURL('/login')

    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
  })

  test('フロントエンドバリデーション: メール未入力でエラーが表示される', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[type="password"]').fill('E2eSales99!')
    await page.getByRole('button', { name: 'ログイン' }).click()

    await expect(page.locator('.form-error').first()).toBeVisible()
    await expect(page).toHaveURL('/login')
  })

  test('ログイン後にログインページへアクセスするとダッシュボードにリダイレクトされる', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/login')
    await expect(page).toHaveURL('/dashboard')
  })
})
