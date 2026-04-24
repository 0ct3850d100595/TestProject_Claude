import { z } from 'zod'

export const createEmployeeSchema = z.object({
  name: z
    .string()
    .min(1, { message: '氏名は必須です' })
    .max(50, { message: '氏名は50文字以内で入力してください' }),
  email: z.string().email({ message: 'メールアドレスの形式が正しくありません' }),
  password: z
    .string()
    .min(8, { message: 'パスワードは8文字以上で入力してください' })
    .max(100, { message: 'パスワードは100文字以内で入力してください' }),
  role: z.enum(['sales', 'manager', 'admin'], { message: 'ロールはsales・manager・adminのいずれかを指定してください' }),
  manager_id: z.number().int().positive().optional().nullable(),
})

export const updateEmployeeSchema = z.object({
  name: z
    .string()
    .min(1, { message: '氏名は必須です' })
    .max(50, { message: '氏名は50文字以内で入力してください' }),
  email: z.string().email({ message: 'メールアドレスの形式が正しくありません' }),
  password: z
    .string()
    .min(8, { message: 'パスワードは8文字以上で入力してください' })
    .max(100, { message: 'パスワードは100文字以内で入力してください' })
    .optional(),
  role: z.enum(['sales', 'manager', 'admin'], { message: 'ロールはsales・manager・adminのいずれかを指定してください' }),
  manager_id: z.number().int().positive().optional().nullable(),
})

export const employeeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
  role: z.enum(['sales', 'manager', 'admin']).optional(),
})
