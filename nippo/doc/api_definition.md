# 営業日報システム API定義書

**バージョン:** 1.0  
**作成日:** 2026-04-20  
**ベースURL:** `https://api.example.com/v1`  
**認証方式:** Bearer Token（JWT）

---

## 目次

1. [共通仕様](#1-共通仕様)
2. [認証 API](#2-認証-api)
3. [日報 API](#3-日報-api)
4. [訪問記録 API](#4-訪問記録-api)
5. [上長コメント API](#5-上長コメント-api)
6. [顧客マスタ API](#6-顧客マスタ-api)
7. [社員マスタ API](#7-社員マスタ-api)

---

## 1. 共通仕様

### 1.1 認証

全エンドポイント（ログインを除く）はリクエストヘッダーに JWT トークンが必要です。

```
Authorization: Bearer <token>
```

### 1.2 リクエスト・レスポンス形式

- Content-Type: `application/json`
- 文字コード: UTF-8
- 日付フォーマット: `YYYY-MM-DD`
- 日時フォーマット: `YYYY-MM-DDTHH:mm:ssZ`（ISO 8601）

### 1.3 共通レスポンス構造

**成功時**

```json
{
  "success": true,
  "data": { ... }
}
```

**一覧取得時（ページネーション付き）**

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "total": 100,
    "page": 1,
    "per_page": 20,
    "total_pages": 5
  }
}
```

**エラー時**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容に誤りがあります",
    "details": [
      { "field": "report_date", "message": "未来の日付は指定できません" }
    ]
  }
}
```

### 1.4 HTTPステータスコード

| コード | 意味 | 用途 |
|--------|------|------|
| 200 | OK | 取得・更新成功 |
| 201 | Created | 新規作成成功 |
| 400 | Bad Request | バリデーションエラー |
| 401 | Unauthorized | 認証エラー（トークン不正・期限切れ） |
| 403 | Forbidden | 権限エラー |
| 404 | Not Found | リソースが存在しない |
| 409 | Conflict | 重複エラー（同一日付の日報など） |
| 500 | Internal Server Error | サーバーエラー |

### 1.5 エラーコード一覧

| エラーコード | 説明 |
|-------------|------|
| `UNAUTHORIZED` | 認証トークンが無効または期限切れ |
| `FORBIDDEN` | 操作権限なし |
| `NOT_FOUND` | 対象リソースが存在しない |
| `VALIDATION_ERROR` | 入力バリデーション違反 |
| `DUPLICATE_ENTRY` | 一意制約違反（日報の日付重複など） |
| `INTERNAL_ERROR` | サーバー内部エラー |

### 1.6 ロール権限まとめ

| ロール | 説明 |
|--------|------|
| `sales` | 自分の日報のみ作成・閲覧・編集可 |
| `manager` | 自分と部下の日報を閲覧可。部下の日報にコメント可 |
| `admin` | 全リソースへのフルアクセス。マスタ管理可 |

---

## 2. 認証 API

### POST /auth/login

ログイン認証を行い、JWTトークンを発行します。

**リクエスト**

```json
{
  "email": "yamada@example.com",
  "password": "password123"
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|----|------|------|
| email | string | ✓ | メールアドレス |
| password | string | ✓ | パスワード（8文字以上） |

**レスポンス (200)**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2026-04-21T10:00:00Z",
    "employee": {
      "id": 1,
      "name": "山田 太郎",
      "email": "yamada@example.com",
      "role": "sales",
      "manager_id": 2
    }
  }
}
```

**エラーレスポンス (401)**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "メールアドレスまたはパスワードが正しくありません"
  }
}
```

---

### POST /auth/logout

ログアウトしてトークンを無効化します。

**リクエストヘッダー:** `Authorization: Bearer <token>`

**レスポンス (200)**

```json
{
  "success": true,
  "data": null
}
```

---

### GET /auth/me

ログイン中のユーザー情報を取得します。

**レスポンス (200)**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "山田 太郎",
    "email": "yamada@example.com",
    "role": "sales",
    "manager_id": 2,
    "manager_name": "佐藤 部長"
  }
}
```

---

## 3. 日報 API

### GET /reports

日報一覧を取得します。

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|------------|----|------|------|
| page | integer | - | ページ番号（デフォルト: 1） |
| per_page | integer | - | 1ページの件数（デフォルト: 20, 最大: 100） |
| employee_id | integer | - | 担当者ID（manager/adminのみ指定可。salesは自分固定） |
| date_from | string | - | 期間開始日（YYYY-MM-DD） |
| date_to | string | - | 期間終了日（YYYY-MM-DD） |
| sort | string | - | ソート項目: `report_date`（デフォルト）, `employee_name` |
| order | string | - | ソート順: `desc`（デフォルト）, `asc` |

**レスポンス (200)**

```json
{
  "success": true,
  "data": [
    {
      "id": 101,
      "report_date": "2026-04-20",
      "employee": {
        "id": 1,
        "name": "山田 太郎"
      },
      "visit_count": 3,
      "has_comment": true,
      "created_at": "2026-04-20T18:30:00Z",
      "updated_at": "2026-04-20T18:30:00Z"
    }
  ],
  "meta": {
    "total": 40,
    "page": 1,
    "per_page": 20,
    "total_pages": 2
  }
}
```

**権限:**
- `sales`: 自分の日報のみ返却
- `manager`: 自分と部下全員の日報を返却
- `admin`: 全員の日報を返却

---

### GET /reports/{id}

日報の詳細を取得します。

**パスパラメータ**

| パラメータ | 型 | 説明 |
|------------|----|------|
| id | integer | 日報ID |

**レスポンス (200)**

```json
{
  "success": true,
  "data": {
    "id": 101,
    "report_date": "2026-04-20",
    "employee": {
      "id": 1,
      "name": "山田 太郎"
    },
    "problem": "競合他社が値引き攻勢をかけており、□□社の案件が難航している。",
    "plan": "・□□社への見積書を作成する\n・◇◇株式会社へアポイントを取る",
    "visit_records": [
      {
        "id": 201,
        "sort_order": 1,
        "customer": {
          "id": 10,
          "company_name": "株式会社○○",
          "contact_name": "田中 一郎"
        },
        "visit_content": "新製品の提案を実施。先方の担当者より前向きな回答を得た。"
      },
      {
        "id": 202,
        "sort_order": 2,
        "customer": {
          "id": 11,
          "company_name": "△△商事",
          "contact_name": "鈴木 二郎"
        },
        "visit_content": "定期フォロー訪問。特に進展なし。"
      }
    ],
    "manager_comment": {
      "id": 301,
      "comment": "□□社の件、明日相談しましょう。見積もりは私も確認します。",
      "manager": {
        "id": 2,
        "name": "佐藤 部長"
      },
      "commented_at": "2026-04-20T21:00:00Z"
    },
    "created_at": "2026-04-20T18:30:00Z",
    "updated_at": "2026-04-20T18:30:00Z"
  }
}
```

**エラー:**
- 404: 日報が存在しない
- 403: 閲覧権限なし（他人の日報をsalesが取得しようとした場合）

---

### POST /reports

日報を新規作成します。

**権限:** `sales`（自分の日報のみ）、`admin`

**リクエスト**

```json
{
  "report_date": "2026-04-20",
  "problem": "競合他社が値引き攻勢をかけており、□□社の案件が難航している。",
  "plan": "・□□社への見積書を作成する\n・◇◇株式会社へアポイントを取る",
  "visit_records": [
    {
      "customer_id": 10,
      "visit_content": "新製品の提案を実施。先方の担当者より前向きな回答を得た。",
      "sort_order": 1
    },
    {
      "customer_id": 11,
      "visit_content": "定期フォロー訪問。特に進展なし。",
      "sort_order": 2
    }
  ]
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|----|------|------|
| report_date | string | ✓ | 報告日（YYYY-MM-DD）。未来日不可 |
| problem | string | - | 課題・相談（最大2000文字） |
| plan | string | - | 明日やること（最大2000文字） |
| visit_records | array | ✓ | 訪問記録（1件以上必須） |
| visit_records[].customer_id | integer | ✓ | 顧客マスタID |
| visit_records[].visit_content | string | ✓ | 訪問内容（最大1000文字） |
| visit_records[].sort_order | integer | ✓ | 表示順（1始まり） |

**レスポンス (201)**

```json
{
  "success": true,
  "data": {
    "id": 101,
    "report_date": "2026-04-20",
    "employee": {
      "id": 1,
      "name": "山田 太郎"
    },
    "problem": "...",
    "plan": "...",
    "visit_records": [ ... ],
    "manager_comment": null,
    "created_at": "2026-04-20T18:30:00Z",
    "updated_at": "2026-04-20T18:30:00Z"
  }
}
```

**エラー:**
- 400: バリデーションエラー（未来日、必須項目欠如など）
- 409: 同一ユーザー・同一日付の日報が既に存在する

---

### PUT /reports/{id}

日報を更新します。訪問記録は全件を差し替えます。

**権限:** 日報の作成者本人のみ

**リクエスト**（POST /reports と同じ構造）

**レスポンス (200)**（GET /reports/{id} と同じ構造）

**エラー:**
- 403: 他人の日報を編集しようとした場合
- 404: 日報が存在しない

---

### DELETE /reports/{id}

日報を削除します。

**権限:** `admin` のみ

**レスポンス (200)**

```json
{
  "success": true,
  "data": null
}
```

---

## 4. 訪問記録 API

> 訪問記録は日報作成・更新時（`POST /reports`, `PUT /reports/{id}`）に一括で登録・更新されます。  
> 個別操作が必要な場合のために以下のエンドポイントも提供します。

### POST /reports/{report_id}/visit_records

訪問記録を1件追加します。

**権限:** 日報の作成者本人のみ

**リクエスト**

```json
{
  "customer_id": 12,
  "visit_content": "初回訪問。担当者と名刺交換。次回デモを実施予定。",
  "sort_order": 3
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|----|------|------|
| customer_id | integer | ✓ | 顧客マスタID |
| visit_content | string | ✓ | 訪問内容（最大1000文字） |
| sort_order | integer | ✓ | 表示順 |

**レスポンス (201)**

```json
{
  "success": true,
  "data": {
    "id": 203,
    "sort_order": 3,
    "customer": {
      "id": 12,
      "company_name": "◇◇株式会社",
      "contact_name": "高橋 三郎"
    },
    "visit_content": "初回訪問。担当者と名刺交換。次回デモを実施予定。"
  }
}
```

---

### PUT /reports/{report_id}/visit_records/{id}

訪問記録を更新します。

**権限:** 日報の作成者本人のみ

**リクエスト**（POST と同じ構造）

**レスポンス (200)**（POST と同じ構造）

---

### DELETE /reports/{report_id}/visit_records/{id}

訪問記録を削除します。

**権限:** 日報の作成者本人のみ

**レスポンス (200)**

```json
{
  "success": true,
  "data": null
}
```

**エラー:**
- 400: 訪問記録が1件のみの場合は削除不可

---

## 5. 上長コメント API

### POST /reports/{report_id}/comment

日報にコメントを投稿します。

**権限:** `manager`（部下の日報のみ）、`admin`

**リクエスト**

```json
{
  "comment": "□□社の件、明日相談しましょう。見積もりは私も確認します。"
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|----|------|------|
| comment | string | ✓ | コメント本文（最大2000文字） |

**レスポンス (201)**

```json
{
  "success": true,
  "data": {
    "id": 301,
    "comment": "□□社の件、明日相談しましょう。見積もりは私も確認します。",
    "manager": {
      "id": 2,
      "name": "佐藤 部長"
    },
    "commented_at": "2026-04-20T21:00:00Z"
  }
}
```

**エラー:**
- 403: 権限なし（salesロール、または部下でない日報へのコメント）
- 409: すでにコメントが存在する（1日報につき1件制限）

---

## 6. 顧客マスタ API

### GET /customers

顧客一覧を取得します。

**権限:** 全ロール

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|------------|----|------|------|
| page | integer | - | ページ番号（デフォルト: 1） |
| per_page | integer | - | 1ページの件数（デフォルト: 20, 最大: 100） |
| keyword | string | - | 会社名・担当者名の部分一致検索 |
| sort | string | - | ソート項目: `company_name`（デフォルト）, `contact_name` |
| order | string | - | ソート順: `asc`（デフォルト）, `desc` |

**レスポンス (200)**

```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "company_name": "株式会社○○",
      "contact_name": "田中 一郎",
      "phone": "03-1234-5678",
      "email": "tanaka@example.co.jp",
      "created_at": "2026-01-10T09:00:00Z"
    }
  ],
  "meta": {
    "total": 15,
    "page": 1,
    "per_page": 20,
    "total_pages": 1
  }
}
```

---

### GET /customers/{id}

顧客の詳細を取得します。

**権限:** 全ロール

**レスポンス (200)**

```json
{
  "success": true,
  "data": {
    "id": 10,
    "company_name": "株式会社○○",
    "contact_name": "田中 一郎",
    "phone": "03-1234-5678",
    "email": "tanaka@example.co.jp",
    "created_at": "2026-01-10T09:00:00Z",
    "updated_at": "2026-03-15T14:20:00Z"
  }
}
```

---

### POST /customers

顧客を新規登録します。

**権限:** `manager`、`admin`

**リクエスト**

```json
{
  "company_name": "◇◇株式会社",
  "contact_name": "高橋 三郎",
  "phone": "06-9876-0001",
  "email": "takahashi@diamond.co.jp"
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|----|------|------|
| company_name | string | ✓ | 会社名（最大100文字） |
| contact_name | string | ✓ | 担当者名（最大50文字） |
| phone | string | - | 電話番号（数字・ハイフン、最大20文字） |
| email | string | - | メールアドレス |

**レスポンス (201)**（GET /customers/{id} と同じ構造）

---

### PUT /customers/{id}

顧客情報を更新します。

**権限:** `manager`、`admin`

**リクエスト**（POST /customers と同じ構造）

**レスポンス (200)**（GET /customers/{id} と同じ構造）

---

### DELETE /customers/{id}

顧客を削除します。

**権限:** `admin` のみ

> 訪問記録に紐付いている顧客は削除不可（論理削除）

**レスポンス (200)**

```json
{
  "success": true,
  "data": null
}
```

**エラー:**
- 400: 訪問記録に紐付いているため削除不可の場合はエラーメッセージを返す

---

## 7. 社員マスタ API

### GET /employees

社員一覧を取得します。

**権限:** `admin` のみ

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|------------|----|------|------|
| page | integer | - | ページ番号（デフォルト: 1） |
| per_page | integer | - | 1ページの件数（デフォルト: 20） |
| role | string | - | ロールで絞り込み: `sales`, `manager`, `admin` |

**レスポンス (200)**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "山田 太郎",
      "email": "yamada@example.com",
      "role": "sales",
      "manager": {
        "id": 2,
        "name": "佐藤 部長"
      },
      "created_at": "2026-01-01T09:00:00Z"
    },
    {
      "id": 2,
      "name": "佐藤 部長",
      "email": "sato@example.com",
      "role": "manager",
      "manager": null,
      "created_at": "2026-01-01T09:00:00Z"
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "per_page": 20,
    "total_pages": 1
  }
}
```

---

### GET /employees/{id}

社員の詳細を取得します。

**権限:** `admin`、または本人（自分の情報のみ）

**レスポンス (200)**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "山田 太郎",
    "email": "yamada@example.com",
    "role": "sales",
    "manager": {
      "id": 2,
      "name": "佐藤 部長"
    },
    "created_at": "2026-01-01T09:00:00Z",
    "updated_at": "2026-03-01T10:00:00Z"
  }
}
```

---

### POST /employees

社員を新規登録します。

**権限:** `admin` のみ

**リクエスト**

```json
{
  "name": "鈴木 花子",
  "email": "suzuki@example.com",
  "password": "securePass123",
  "role": "sales",
  "manager_id": 2
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|----|------|------|
| name | string | ✓ | 氏名（最大50文字） |
| email | string | ✓ | メールアドレス（システム内で一意） |
| password | string | ✓ | 初期パスワード（8文字以上） |
| role | string | ✓ | `sales` / `manager` / `admin` |
| manager_id | integer | - | 上長の社員ID。`role: sales` の場合のみ有効 |

**レスポンス (201)**（GET /employees/{id} と同じ構造。passwordは含まない）

**エラー:**
- 409: メールアドレスが既に使用されている

---

### PUT /employees/{id}

社員情報を更新します。パスワード変更には `password` フィールドを含めます。

**権限:** `admin` のみ

**リクエスト**

```json
{
  "name": "鈴木 花子",
  "email": "suzuki@example.com",
  "role": "sales",
  "manager_id": 2,
  "password": "newPassword456"
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|----|------|------|
| name | string | ✓ | 氏名 |
| email | string | ✓ | メールアドレス |
| role | string | ✓ | `sales` / `manager` / `admin` |
| manager_id | integer | - | 上長の社員ID |
| password | string | - | 変更する場合のみ指定（8文字以上） |

**レスポンス (200)**（GET /employees/{id} と同じ構造）

---

### DELETE /employees/{id}

社員を論理削除します。

**権限:** `admin` のみ

> 削除後もその社員が作成した日報・訪問記録は保持されます。

**レスポンス (200)**

```json
{
  "success": true,
  "data": null
}
```

**エラー:**
- 400: 自分自身は削除不可

---

## 付録: エンドポイント一覧

| メソッド | パス | 説明 | 権限 |
|----------|------|------|------|
| POST | /auth/login | ログイン | 全員（未認証） |
| POST | /auth/logout | ログアウト | 全員 |
| GET | /auth/me | ログインユーザー情報取得 | 全員 |
| GET | /reports | 日報一覧取得 | 全員 |
| GET | /reports/{id} | 日報詳細取得 | 全員（権限範囲内） |
| POST | /reports | 日報作成 | sales, admin |
| PUT | /reports/{id} | 日報更新 | 作成者本人 |
| DELETE | /reports/{id} | 日報削除 | admin |
| POST | /reports/{report_id}/visit_records | 訪問記録追加 | 作成者本人 |
| PUT | /reports/{report_id}/visit_records/{id} | 訪問記録更新 | 作成者本人 |
| DELETE | /reports/{report_id}/visit_records/{id} | 訪問記録削除 | 作成者本人 |
| POST | /reports/{report_id}/comment | 上長コメント投稿 | manager, admin |
| GET | /customers | 顧客一覧取得 | 全員 |
| GET | /customers/{id} | 顧客詳細取得 | 全員 |
| POST | /customers | 顧客登録 | manager, admin |
| PUT | /customers/{id} | 顧客更新 | manager, admin |
| DELETE | /customers/{id} | 顧客削除 | admin |
| GET | /employees | 社員一覧取得 | admin |
| GET | /employees/{id} | 社員詳細取得 | admin, 本人 |
| POST | /employees | 社員登録 | admin |
| PUT | /employees/{id} | 社員更新 | admin |
| DELETE | /employees/{id} | 社員削除 | admin |

---

*以上*
