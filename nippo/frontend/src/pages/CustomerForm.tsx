import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCustomer, createCustomer, updateCustomer } from '../api/customers'
import Spinner from '../components/Spinner'

const schema = z.object({
  company_name: z.string().min(1, '会社名は必須です').max(100, '100文字以内で入力してください'),
  contact_name: z.string().min(1, '担当者名は必須です').max(50, '50文字以内で入力してください'),
  phone: z.string().max(20, '20文字以内で入力してください').regex(/^[\d-]*$/, '数字とハイフンのみ使用できます').optional().or(z.literal('')),
  email: z.string().email('メールアドレスの形式が正しくありません').optional().or(z.literal('')),
})
type FormValues = z.infer<typeof schema>

export default function CustomerForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const customerId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = useState('')

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomer(customerId),
    enabled: isEdit,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { company_name: '', contact_name: '', phone: '', email: '' },
  })

  useEffect(() => {
    if (customer) {
      reset({
        company_name: customer.company_name,
        contact_name: customer.contact_name,
        phone: customer.phone ?? '',
        email: customer.email ?? '',
      })
    }
  }, [customer, reset])

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const input = {
        company_name: values.company_name,
        contact_name: values.contact_name,
        phone: values.phone || null,
        email: values.email || null,
      }
      return isEdit ? updateCustomer(customerId, input) : createCustomer(input)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customers'] })
      navigate('/customers')
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      setSubmitError(err.response?.data?.error?.message ?? '保存に失敗しました')
    },
  })

  const handleCancel = () => {
    if (confirm('変更を破棄して戻りますか？')) navigate('/customers')
  }

  if (isEdit && isLoading) return <Spinner center dark />

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{isEdit ? '顧客を編集' : '顧客を登録'}</h1>
      </div>

      {submitError && <div className="alert alert-error">{submitError}</div>}

      <div className="card">
        <form onSubmit={handleSubmit((v) => { setSubmitError(''); mutation.mutate(v) })}>
          <div className="form-group">
            <label className="form-label">会社名<span className="required">*</span></label>
            <input type="text" className={`form-control${errors.company_name ? ' error' : ''}`} {...register('company_name')} />
            {errors.company_name && <p className="form-error">{errors.company_name.message}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">担当者名<span className="required">*</span></label>
            <input type="text" className={`form-control${errors.contact_name ? ' error' : ''}`} {...register('contact_name')} />
            {errors.contact_name && <p className="form-error">{errors.contact_name.message}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">電話番号</label>
            <input type="text" className={`form-control${errors.phone ? ' error' : ''}`} placeholder="例: 03-1234-5678" {...register('phone')} />
            {errors.phone && <p className="form-error">{errors.phone.message}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">メールアドレス</label>
            <input type="email" className={`form-control${errors.email ? ' error' : ''}`} {...register('email')} />
            {errors.email && <p className="form-error">{errors.email.message}</p>}
          </div>

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
