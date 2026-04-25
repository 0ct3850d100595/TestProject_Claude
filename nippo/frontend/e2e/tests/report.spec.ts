import { test, expect, loginAs, pastDate, futureDate } from '../fixtures.js'

test.describe('日報作成フロー（salesロール）', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'sales')
  })

  test('/reports/new から日報を正常に作成できる', async ({ page }) => {
    await page.goto('/reports/new')
    await expect(page.getByRole('heading', { name: '日報を作成' })).toBeVisible()

    // 報告日を昨日に設定（デフォルトは今日だが確認のため明示設定）
    const reportDate = pastDate(2)
    await page.locator('input[type="date"]').fill(reportDate)

    // 顧客を選択
    await page.locator('select').first().selectOption({ value: process.env.E2E_CUSTOMER_ID! })

    // 訪問内容を入力
    await page.locator('textarea').first().fill('E2Eテスト用訪問内容')

    // 課題・計画を入力
    await page.getByPlaceholder('').or(page.locator('textarea').nth(1)).fill('E2Eテスト課題').catch(() => {})

    await page.getByRole('button', { name: /保存/ }).click()

    // 詳細画面に遷移することを確認
    await expect(page).toHaveURL(/\/reports\/\d+$/)
    await expect(page.getByRole('heading', { name: '日報詳細' })).toBeVisible()
    await expect(page.getByText('E2Eテスト用訪問内容')).toBeVisible()
  })

  test('訪問先を追加できる', async ({ page }) => {
    await page.goto('/reports/new')

    // 初期状態で訪問記録が1件
    await expect(page.locator('.visit-row')).toHaveCount(1)

    // 1件目に顧客・内容を入力
    await page.locator('select').first().selectOption({ value: process.env.E2E_CUSTOMER_ID! })
    await page.locator('textarea').first().fill('1件目の訪問内容')

    // 訪問先を追加
    await page.getByRole('button', { name: /\+ 訪問先を追加する/ }).click()
    await expect(page.locator('.visit-row')).toHaveCount(2)

    // 2件目にも顧客・内容を入力
    await page.locator('select').nth(1).selectOption({ value: process.env.E2E_CUSTOMER_ID! })
    await page.locator('textarea').nth(1).fill('2件目の訪問内容')

    await page.getByRole('button', { name: /保存/ }).click()
    await expect(page).toHaveURL(/\/reports\/\d+$/)
    await expect(page.getByText('1件目の訪問内容')).toBeVisible()
    await expect(page.getByText('2件目の訪問内容')).toBeVisible()
  })

  test('訪問記録が1件のみの場合は削除ボタン（−）が表示されない', async ({ page }) => {
    await page.goto('/reports/new')

    // 初期状態（1件）では削除ボタンが非表示
    await expect(page.locator('button.btn-danger')).toHaveCount(0)

    // 2件目を追加すると削除ボタンが出現
    await page.getByRole('button', { name: /\+ 訪問先を追加する/ }).click()
    await expect(page.locator('button.btn-danger')).toHaveCount(2)
  })

  test('訪問記録を追加後に削除できる', async ({ page }) => {
    await page.goto('/reports/new')

    // 訪問先を追加して2件にする
    await page.getByRole('button', { name: /\+ 訪問先を追加する/ }).click()
    await expect(page.locator('.visit-row')).toHaveCount(2)

    // 2件目を削除（確認ダイアログを承認）
    page.on('dialog', (dialog) => dialog.accept())
    await page.locator('button.btn-danger').nth(1).click()

    await expect(page.locator('.visit-row')).toHaveCount(1)
    // 削除後は再び削除ボタンが非表示
    await expect(page.locator('button.btn-danger')).toHaveCount(0)
  })

  test('未来日を指定するとバリデーションエラーが表示される', async ({ page }) => {
    await page.goto('/reports/new')

    // max属性を外してからPlaywrightのfillで未来日をセット（Chromiumはmax違反の値を拒否するため）
    await page.locator('input[type="date"]').evaluate(
      (el) => { (el as HTMLInputElement).removeAttribute('max') },
    )
    await page.locator('input[type="date"]').fill(futureDate(1))

    await page.locator('select').first().selectOption({ value: process.env.E2E_CUSTOMER_ID! })
    await page.locator('textarea').first().fill('訪問内容')
    await page.getByRole('button', { name: /保存/ }).click()

    await expect(page.locator('.form-error').first()).toContainText('未来の日付は指定できません')
    await expect(page).toHaveURL('/reports/new')
  })

  test('訪問内容未入力でバリデーションエラーが表示される', async ({ page }) => {
    await page.goto('/reports/new')

    await page.locator('select').first().selectOption({ value: process.env.E2E_CUSTOMER_ID! })
    // 訪問内容を空のまま保存
    await page.getByRole('button', { name: /保存/ }).click()

    await expect(page.locator('.form-error').first()).toBeVisible()
    await expect(page).toHaveURL('/reports/new')
  })
})
