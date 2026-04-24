import { z } from 'zod'

export const visitRecordSchema = z.object({
  customer_id: z.number().int().positive({ message: '顧客IDは正の整数で指定してください' }),
  visit_content: z
    .string()
    .min(1, { message: '訪問内容は必須です' })
    .max(1000, { message: '訪問内容は1000文字以内で入力してください' }),
  sort_order: z.number().int().min(1, { message: '表示順は1以上の整数で指定してください' }),
})
