import { z } from 'zod'

export const listReportsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  employee_id: z.coerce.number().int().positive().optional(),
  date_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: '日付はYYYY-MM-DD形式で入力してください' })
    .optional(),
  date_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: '日付はYYYY-MM-DD形式で入力してください' })
    .optional(),
  sort: z.enum(['report_date', 'employee_name']).default('report_date'),
  order: z.enum(['asc', 'desc']).default('desc'),
}).superRefine((data, ctx) => {
  if (data.date_from && data.date_to && data.date_from > data.date_to) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['date_to'],
      message: 'date_to は date_from 以降の日付を指定してください',
    })
  }
})

const visitRecordInputSchema = z.object({
  customer_id: z.number().int().positive({ message: '顧客IDは正の整数で指定してください' }),
  visit_content: z
    .string()
    .min(1, { message: '訪問内容は必須です' })
    .max(1000, { message: '訪問内容は1000文字以内で入力してください' }),
  sort_order: z.number().int().min(1, { message: '表示順は1以上の整数で指定してください' }),
})

export const createReportSchema = z.object({
  report_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: '日付はYYYY-MM-DD形式で入力してください' })
    .refine(
      (val) => {
        const d = new Date(val)
        return !isNaN(d.getTime()) && d.toISOString().startsWith(val)
      },
      { message: '有効な日付を入力してください' },
    ),
  problem: z.string().max(2000, { message: '課題・相談は2000文字以内で入力してください' }).optional(),
  plan: z.string().max(2000, { message: '明日やることは2000文字以内で入力してください' }).optional(),
  visit_records: z
    .array(visitRecordInputSchema)
    .min(1, { message: '訪問記録は1件以上必要です' }),
})

export const updateReportSchema = createReportSchema
