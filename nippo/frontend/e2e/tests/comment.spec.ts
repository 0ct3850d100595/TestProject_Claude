import { test, expect, loginAs } from '../fixtures.js'

test.describe('上長コメントフロー（managerロール）', () => {
  test('部下の日報詳細でコメント入力フォームが表示される', async ({ page }) => {
    await loginAs(page, 'manager')

    const reportId = process.env.E2E_REPORT_ID
    await page.goto(`/reports/${reportId}`)

    await expect(page.getByRole('heading', { name: '日報詳細' })).toBeVisible()
    // コメントフォームが表示されていること
    await expect(page.locator('textarea[placeholder*="コメント"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'コメントを保存' })).toBeVisible()
  })

  test('コメント投稿後にフォームが非表示になり投稿内容が表示される', async ({ page }) => {
    await loginAs(page, 'manager')

    const reportId = process.env.E2E_REPORT_ID
    await page.goto(`/reports/${reportId}`)

    // コメントを投稿
    await page.locator('textarea[placeholder*="コメント"]').fill('E2Eテスト用コメントです')
    await page.getByRole('button', { name: 'コメントを保存' }).click()

    // 投稿後はフォームが消えて内容が表示される
    await expect(page.locator('.comment-box')).toBeVisible()
    await expect(page.getByText('E2Eテスト用コメントです')).toBeVisible()
    await expect(page.locator('textarea[placeholder*="コメント"]')).toHaveCount(0)
    // manager名が表示される
    await expect(page.locator('.comment-meta').getByText(/E2E部長/)).toBeVisible()
  })

  test('salesロールの場合コメント入力フォームが表示されない', async ({ page }) => {
    await loginAs(page, 'sales')

    const reportId = process.env.E2E_REPORT_ID
    await page.goto(`/reports/${reportId}`)

    await expect(page.getByRole('heading', { name: '日報詳細' })).toBeVisible()
    // salesにはコメント入力フォームが表示されない
    await expect(page.locator('textarea[placeholder*="コメント"]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'コメントを保存' })).toHaveCount(0)
  })
})
