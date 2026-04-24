import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getReport, postComment } from '../api/reports'
import { useAuthStore } from '../store/authStore'
import Spinner from '../components/Spinner'

const commentSchema = z.object({
  comment: z.string().min(1, 'コメントを入力してください').max(2000, '2000文字以内で入力してください'),
})
type CommentForm = z.infer<typeof commentSchema>

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>()
  const reportId = Number(id)
  const navigate = useNavigate()
  const { employee } = useAuthStore()
  const role = employee?.role
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = useState('')

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => getReport(reportId),
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CommentForm>({
    resolver: zodResolver(commentSchema),
  })

  const commentMutation = useMutation({
    mutationFn: (comment: string) => postComment(reportId, comment),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['report', reportId] })
      void queryClient.invalidateQueries({ queryKey: ['reports'] })
      reset()
      setSubmitError('')
    },
    onError: (err: { response?: { status?: number; data?: { error?: { message?: string } } } }) => {
      if (err.response?.status === 403) {
        setSubmitError('この日報へのコメント権限がありません')
      } else {
        setSubmitError(err.response?.data?.error?.message ?? 'コメントの投稿に失敗しました')
      }
    },
  })

  const onCommentSubmit = ({ comment }: CommentForm) => {
    setSubmitError('')
    commentMutation.mutate(comment)
  }

  if (isLoading) return <Spinner center dark />
  if (!report) return <div className="alert alert-error">日報が見つかりません</div>

  const isOwner = employee?.id === report.employee.id
  const canComment = (role === 'manager' || role === 'admin') && !report.manager_comment

  const formatDate = (s: string) => {
    const [y, m, d] = s.split('-')
    return `${y}年${m}月${d}日`
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">日報詳細</h1>
        <div className="flex gap-2">
          {isOwner && (
            <button className="btn btn-secondary" onClick={() => navigate(`/reports/${reportId}/edit`)}>編集</button>
          )}
          <button className="btn btn-secondary" onClick={() => navigate('/reports')}>一覧に戻る</button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="detail-grid">
          <span className="detail-label">報告日</span>
          <span className="detail-value">{formatDate(report.report_date)}</span>
          <span className="detail-label">担当者</span>
          <span className="detail-value">{report.employee.name}</span>
        </div>

        <div className="section-title">訪問記録</div>
        {report.visit_records.map((vr, i) => (
          <div key={vr.id} style={{ marginBottom: '12px', padding: '12px', background: 'var(--bg)', borderRadius: '6px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              {i + 1}. {vr.customer.company_name}（{vr.customer.contact_name}）
            </div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{vr.visit_content}</div>
          </div>
        ))}

        {report.problem && (
          <>
            <div className="section-title">今日の課題・相談</div>
            <p className="detail-value">{report.problem}</p>
          </>
        )}

        {report.plan && (
          <>
            <div className="section-title">明日やること</div>
            <p className="detail-value">{report.plan}</p>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-title">上長コメント</div>
        {report.manager_comment ? (
          <div className="comment-box">
            <div className="comment-meta">
              {report.manager_comment.manager.name} — {new Date(report.manager_comment.commented_at).toLocaleString('ja-JP')}
            </div>
            <p className="comment-text">{report.manager_comment.comment}</p>
          </div>
        ) : (
          <>
            {role === 'sales' && <p className="no-comment">まだコメントはありません</p>}
            {canComment && (
              <form onSubmit={handleSubmit(onCommentSubmit)}>
                {submitError && <div className="alert alert-error">{submitError}</div>}
                <div className="form-group">
                  <label className="form-label">コメント<span className="required">*</span></label>
                  <textarea
                    className={`form-control${errors.comment ? ' error' : ''}`}
                    rows={4}
                    placeholder="コメントを入力してください"
                    {...register('comment')}
                  />
                  {errors.comment && <p className="form-error">{errors.comment.message}</p>}
                </div>
                <div className="text-right">
                  <button type="submit" className="btn btn-primary" disabled={commentMutation.isPending}>
                    {commentMutation.isPending ? <><Spinner /> 投稿中...</> : 'コメントを保存'}
                  </button>
                </div>
              </form>
            )}
            {!canComment && role !== 'sales' && (
              <p className="no-comment">まだコメントはありません</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
