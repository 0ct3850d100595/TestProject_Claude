import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getReport, createReport, updateReport } from '../api/reports'
import { listCustomers } from '../api/customers'
import Spinner from '../components/Spinner'

const visitSchema = z.object({
  customer_id: z.number({ invalid_type_error: '顧客を選択してください' }).int().positive('顧客を選択してください'),
  visit_content: z.string().min(1, '訪問内容を入力してください').max(1000, '1000文字以内で入力してください'),
  sort_order: z.number().int(),
})

const schema = z.object({
  report_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付を選択してください'),
  problem: z.string().max(2000, '2000文字以内で入力してください').optional(),
  plan: z.string().max(2000, '2000文字以内で入力してください').optional(),
  visit_records: z.array(visitSchema).min(1, '訪問記録は1件以上必要です'),
})
type FormValues = z.infer<typeof schema>

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function ReportForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const reportId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = useState('')

  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => getReport(reportId),
    enabled: isEdit,
  })

  const { data: custData, isLoading: custLoading } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => listCustomers({ per_page: 100 }),
  })

  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      report_date: today(),
      visit_records: [{ customer_id: 0, visit_content: '', sort_order: 1 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'visit_records' })

  useEffect(() => {
    if (report) {
      reset({
        report_date: report.report_date,
        problem: report.problem ?? '',
        plan: report.plan ?? '',
        visit_records: report.visit_records.map((vr) => ({
          customer_id: vr.customer.id,
          visit_content: vr.visit_content,
          sort_order: vr.sort_order,
        })),
      })
    }
  }, [report, reset])

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const input = {
        report_date: values.report_date,
        problem: values.problem || undefined,
        plan: values.plan || undefined,
        visit_records: values.visit_records.map((vr, i) => ({ ...vr, sort_order: i + 1 })),
      }
      return isEdit ? updateReport(reportId, input) : createReport(input)
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['reports'] })
      void queryClient.invalidateQueries({ queryKey: ['report', reportId] })
      navigate(`/reports/${data.id}`)
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      setSubmitError(err.response?.data?.error?.message ?? '保存に失敗しました')
    },
  })

  const addVisit = () => append({ customer_id: 0, visit_content: '', sort_order: fields.length + 1 })

  const removeVisit = (index: number) => {
    if (fields.length <= 1) return
    if (confirm('この訪問記録を削除しますか？')) remove(index)
  }

  const handleCancel = () => {
    if (confirm('変更を破棄して戻りますか？')) navigate(-1)
  }

  if ((isEdit && reportLoading) || custLoading) return <Spinner center dark />

  const todayStr = today()
  const reportDate = watch('report_date')

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{isEdit ? '日報を編集' : '日報を作成'}</h1>
      </div>

      {submitError && <div className="alert alert-error">{submitError}</div>}

      <form onSubmit={handleSubmit((v) => { setSubmitError(''); mutation.mutate(v) })}>
        <div className="card mb-4">
          <div className="form-group">
            <label className="form-label">報告日<span className="required">*</span></label>
            <input
              type="date"
              className={`form-control${errors.report_date ? ' error' : ''}`}
              max={todayStr}
              {...register('report_date')}
            />
            {errors.report_date && <p className="form-error">{errors.report_date.message}</p>}
            {reportDate > todayStr && <p className="form-error">未来の日付は指定できません</p>}
          </div>
        </div>

        <div className="card mb-4">
          <div className="card-title">訪問記録</div>
          {errors.visit_records?.root && (
            <p className="form-error mb-4">{errors.visit_records.root.message}</p>
          )}
          {fields.map((field, index) => (
            <div key={field.id} className="visit-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">顧客<span className="required">*</span></label>
                <select
                  className={`form-control${errors.visit_records?.[index]?.customer_id ? ' error' : ''}`}
                  {...register(`visit_records.${index}.customer_id`, { valueAsNumber: true })}
                >
                  <option value={0}>顧客を選択</option>
                  {custData?.data.map((c) => (
                    <option key={c.id} value={c.id}>{c.company_name}（{c.contact_name}）</option>
                  ))}
                </select>
                {errors.visit_records?.[index]?.customer_id && (
                  <p className="form-error">{errors.visit_records[index].customer_id?.message}</p>
                )}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">訪問内容<span className="required">*</span></label>
                <textarea
                  className={`form-control${errors.visit_records?.[index]?.visit_content ? ' error' : ''}`}
                  rows={2}
                  {...register(`visit_records.${index}.visit_content`)}
                />
                {errors.visit_records?.[index]?.visit_content && (
                  <p className="form-error">{errors.visit_records[index].visit_content?.message}</p>
                )}
              </div>
              <div style={{ paddingTop: '28px' }}>
                {fields.length > 1 && (
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeVisit(index)}>−</button>
                )}
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-secondary btn-sm mt-4" onClick={addVisit}>
            + 訪問先を追加する
          </button>
        </div>

        <div className="card mb-4">
          <div className="form-group">
            <label className="form-label">今日の課題・相談</label>
            <textarea
              className={`form-control${errors.problem ? ' error' : ''}`}
              rows={4}
              placeholder="今日の課題や相談事項を記入してください"
              {...register('problem')}
            />
            {errors.problem && <p className="form-error">{errors.problem.message}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">明日やること</label>
            <textarea
              className={`form-control${errors.plan ? ' error' : ''}`}
              rows={4}
              placeholder="明日の予定を記入してください"
              {...register('plan')}
            />
            {errors.plan && <p className="form-error">{errors.plan.message}</p>}
          </div>
        </div>

        <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={handleCancel}>キャンセル</button>
          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? <><Spinner /> 保存中...</> : '保存する'}
          </button>
        </div>
      </form>
    </div>
  )
}
