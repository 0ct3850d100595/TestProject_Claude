import { z } from 'zod'

export const customerSchema = z.object({
  company_name: z
    .string()
    .min(1, { message: '会社名は必須です' })
    .max(100, { message: '会社名は100文字以内で入力してください' }),
  contact_name: z
    .string()
    .min(1, { message: '担当者名は必須です' })
    .max(50, { message: '担当者名は50文字以内で入力してください' }),
  phone: z
    .string()
    .max(20, { message: '電話番号は20文字以内で入力してください' })
    .regex(/^[\d-]*$/, { message: '電話番号は数字とハイフンのみ使用できます' })
    .optional()
    .nullable(),
  email: z
    .string()
    .email({ message: 'メールアドレスの形式が正しくありません' })
    .optional()
    .nullable(),
})

export const customerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
  keyword: z.string().optional(),
  sort: z.enum(['company_name', 'contact_name']).optional().default('company_name'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
})
