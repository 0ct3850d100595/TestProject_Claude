import { z } from 'zod'

export const commentSchema = z.object({
  comment: z
    .string()
    .min(1, { message: 'コメントは必須です' })
    .max(2000, { message: 'コメントは2000文字以内で入力してください' }),
})
