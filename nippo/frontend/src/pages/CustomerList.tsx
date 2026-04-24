import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listCustomers, getCustomer, deleteCustomer } from '../api/customers'
import type { Customer } from '../api/types'
import { useAuthStore } from '../store/authStore'
import Spinner from '../components/Spinner'
import Pagination from '../components/Pagination'

export default function CustomerList() {
  const navigate = useNavigate()
  const { employee } = useAuthStore()
  const role = employee?.role
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [sort, setSort] = useState<'company_name' | 'contact_name'>('company_name')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [detail, setDetail] = useState<Customer | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const params = { page, per_page: 20, keyword: appliedKeyword || undefined, sort, order }

  const { data, isLoading } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => listCustomers(params),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['customers'] }),
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      alert(err.response?.data?.error?.message ?? '削除に失敗しました')
    },
  })

  const handleSearch = () => { setPage(1); setAppliedKeyword(keyword) }

  const handleSort = (field: 'company_name' | 'contact_name') => {
    const newOrder = sort === field && order === 'asc' ? 'desc' : 'asc'
    setSort(field)
    setOrder(newOrder)
    setPage(1)
  }

  const sortIcon = (field: 'company_name' | 'contact_name') => {
    if (sort !== field) return '⇅'
    return order === 'asc' ? '↑' : '↓'
  }

  const handleDetail = async (id: number) => {
    setDetailLoading(true)
    try {
      const c = await getCustomer(id)
      setDetail(c)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleDelete = (id: number, name: string) => {
    if (confirm(`「${name}」を削除しますか？`)) deleteMutation.mutate(id)
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">顧客マスタ</h1>
        {(role === 'manager' || role === 'admin') && (
          <button className="btn btn-primary" onClick={() => navigate('/customers/new')}>+ 新規登録</button>
        )}
      </div>

      <div className="card mb-4">
        <div className="toolbar">
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <label className="form-label">キーワード検索</label>
            <input
              type="text"
              className="form-control"
              placeholder="会社名・担当者名"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleSearch}>検索</button>
          </div>
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <Spinner center dark />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>
                      <button className={`sort-btn${sort === 'company_name' ? ' active' : ''}`} onClick={() => handleSort('company_name')}>
                        会社名 {sortIcon('company_name')}
                      </button>
                    </th>
                    <th>
                      <button className={`sort-btn${sort === 'contact_name' ? ' active' : ''}`} onClick={() => handleSort('contact_name')}>
                        担当者名 {sortIcon('contact_name')}
                      </button>
                    </th>
                    <th>電話番号</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.length === 0 && (
                    <tr><td colSpan={4} className="text-muted" style={{ textAlign: 'center', padding: '24px' }}>顧客がありません</td></tr>
                  )}
                  {data?.data.map((c) => (
                    <tr key={c.id}>
                      <td>{c.company_name}</td>
                      <td>{c.contact_name}</td>
                      <td>{c.phone ?? '—'}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-secondary btn-sm" onClick={() => handleDetail(c.id)}>詳細</button>
                          {(role === 'manager' || role === 'admin') && (
                            <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/customers/${c.id}/edit`)}>編集</button>
                          )}
                          {role === 'admin' && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id, c.company_name)}>削除</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={data?.meta.total_pages ?? 1} onPage={setPage} />
          </>
        )}
      </div>

      {(detail || detailLoading) && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">顧客詳細</div>
            {detailLoading ? (
              <Spinner center dark />
            ) : detail && (
              <div className="detail-grid">
                <span className="detail-label">会社名</span><span className="detail-value">{detail.company_name}</span>
                <span className="detail-label">担当者名</span><span className="detail-value">{detail.contact_name}</span>
                <span className="detail-label">電話番号</span><span className="detail-value">{detail.phone ?? '—'}</span>
                <span className="detail-label">メール</span><span className="detail-value">{detail.email ?? '—'}</span>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDetail(null)}>閉じる</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
