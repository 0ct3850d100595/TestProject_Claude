import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getEmployee, createEmployee, updateEmployee, listEmployees } from '../api/employees'
import type { Role } from '../api/types'
import Spinner from '../components/Spinner'

const createSchema = z.object({
  name: z.string().min(1, '氏名は必須です').max(50, '50文字以内で入力してください'),
  email: z.string().email('メールアドレスの形式が正しくありません'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください').max(100),
  role: z.enum(['sales', 'manager', 'admin'] as const),
  manager_id: z.number().int().positive().optional().nullable(),
})

const updateSchema = z.object({
  name: z.string().min(1, '氏名は必須です').max(50, '50文字以内で入力してください'),
  email: z.string().email('メールアドレスの形式が正しくありません'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください').max(100).optional().or(z.literal('')),
  role: z.enum(['sales', 'manager', 'admin'] as const),
  manager_id: z.number().int().positive().optional().nullable(),
})

type CreateFormValues = z.infer<typeof createSchema>
type UpdateFormValues = z.infer<typeof updateSchema>
type FormValues = CreateFormValues | UpdateFormValues

const ROLE_LABEL: Record<Role, string> = { sales: '営業担当', manager: '上長', admin: '管理者' }

export default function EmployeeForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const employeeId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = useState('')

  const { data: emp, isLoading: empLoading } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => getEmployee(employeeId),
    enabled: isEdit,
  })

  const { data: managerData } = useQuery({
    queryKey: ['employees-managers'],
    queryFn: () => listEmployees({ per_page: 100, role: 'manager' }),
  })

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? updateSchema : createSchema) as never,
    defaultValues: { name: '', email: '', password: '', role: 'sales', manager_id: null },
  })

  useEffect(() => {
    if (emp) {
      reset({
        name: emp.name,
        email: emp.email,
        password: '',
        role: emp.role,
        manager_id: emp.manager_id,
      })
    }
  }, [emp, reset])

  const watchRole = watch('role')

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (isEdit) {
        const v = values as UpdateFormValues
        return updateEmployee(employeeId, {
          name: v.name,
          email: v.email,
          password: v.password || undefined,
          role: v.role,
          manager_id: v.role === 'sales' ? (v.manager_id ?? null) : null,
        })
      } else {
        const v = values as CreateFormValues
        return createEmployee({
          name: v.name,
          email: v.email,
          password: v.password,
          role: v.role,
          manager_id: v.role === 'sales' ? (v.manager_id ?? null) : null,
        })
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['employees'] })
      navigate('/employees')
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      setSubmitError(err.response?.data?.error?.message ?? '保存に失敗しました')
    },
  })

  const handleCancel = () => {
    if (confirm('変更を破棄して戻りますか？')) navigate('/employees')
  }

  if (isEdit && empLoading) return <Spinner center dark />

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{isEdit ? '社員を編集' : '社員を登録'}</h1>
      </div>

      {submitError && <div className="alert alert-error">{submitError}</div>}

      <div className="card">
        <form onSubmit={handleSubmit((v) => { setSubmitError(''); mutation.mutate(v) })}>
          <div className="form-group">
            <label className="form-label">氏名<span className="required">*</span></label>
            <input type="text" className={`form-control${errors.name ? ' error' : ''}`} {...register('name')} />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">メールアドレス<span className="required">*</span></label>
            <input type="email" className={`form-control${errors.email ? ' error' : ''}`} {...register('email')} />
            {errors.email && <p className="form-error">{errors.email.message}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">
              パスワード{!isEdit && <span className="required">*</span>}
              {isEdit && <span className="text-muted" style={{ fontSize: '12px', fontWeight: 400 }}>（変更する場合のみ入力）</span>}
            </label>
            <input type="password" className={`form-control${'password' in errors && errors.password ? ' error' : ''}`} autoComplete="new-password" {...register('password')} />
            {'password' in errors && errors.password && <p className="form-error">{errors.password.message}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">ロール<span className="required">*</span></label>
            <select className={`form-control${errors.role ? ' error' : ''}`} {...register('role')}>
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
            {errors.role && <p className="form-error">{errors.role.message}</p>}
          </div>
          {watchRole === 'sales' && (
            <div className="form-group">
              <label className="form-label">上長</label>
              <select className="form-control" {...register('manager_id', { valueAsNumber: true, setValueAs: (v: string) => v === '' || v === 'null' ? null : Number(v) })}>
                <option value="">なし</option>
                {managerData?.data.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={handleCancel}>キャンセル</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? <><Spinner /> 保存中...</> : '保存する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
