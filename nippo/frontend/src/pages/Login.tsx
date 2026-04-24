import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { login } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import Spinner from '../components/Spinner'

const schema = z.object({
  email: z.string().email('メールアドレスの形式が正しくありません'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
})
type FormValues = z.infer<typeof schema>

export default function Login() {
  const navigate = useNavigate()
  const { token, login: storeLogin } = useAuthStore()

  useEffect(() => {
    if (token) navigate('/dashboard', { replace: true })
  }, [token, navigate])

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: ({ email, password }: FormValues) => login(email, password),
    onSuccess: (data) => {
      storeLogin(data.token, data.employee)
      navigate('/dashboard', { replace: true })
    },
  })

  const onSubmit = (values: FormValues) => mutation.mutate(values)

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1 className="login-title">営業日報システム</h1>
        <p className="login-sub">メールアドレスとパスワードでログイン</p>

        {mutation.isError && (
          <div className="alert alert-error">
            メールアドレスまたはパスワードが正しくありません
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label">
              メールアドレス<span className="required">*</span>
            </label>
            <input
              type="email"
              className={`form-control${errors.email ? ' error' : ''}`}
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && <p className="form-error">{errors.email.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">
              パスワード<span className="required">*</span>
            </label>
            <input
              type="password"
              className={`form-control${errors.password ? ' error' : ''}`}
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && <p className="form-error">{errors.password.message}</p>}
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={mutation.isPending}>
            {mutation.isPending ? <Spinner /> : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  )
}
