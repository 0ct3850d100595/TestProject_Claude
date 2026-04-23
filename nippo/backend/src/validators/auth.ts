import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'この項目は必須です' })
    .email({ message: 'メールアドレスの形式が正しくありません' }),
  password: z.string().min(1, { message: 'この項目は必須です' }),
})
