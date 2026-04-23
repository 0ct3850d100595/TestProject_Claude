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
})
