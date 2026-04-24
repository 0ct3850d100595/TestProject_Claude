import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listEmployees, deleteEmployee } from '../api/employees'
import { useAuthStore } from '../store/authStore'
import type { Role } from '../api/types'
import Spinner from '../components/Spinner'
import Pagination from '../components/Pagination'

const ROLE_LABEL: Record<Role, string> = { sales: '営業担当', manager: '上長', admin: '管理者' }
const ROLE_BADGE: Record<Role, string> = { sales: 'badge-sales', manager: 'badge-manager', admin: 'badge-admin' }

export default function EmployeeList() {
  const navigate = useNavigate()
  const { employee } = useAuthStore()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [filterRole, setFilterRole] = useState<Role | ''>('')

  const params = { page, per_page: 20, ...(filterRole ? { role: filterRole as Role } : {}) }

  const { data, isLoading } = useQuery({
    queryKey: ['employees', params],
    queryFn: () => listEmployees(params),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['employees'] }),
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      alert(err.response?.data?.error?.message ?? '削除に失敗しました')
    },
  })

  const handleDelete = (id: number, name: string) => {
    if (id === employee?.id) { alert('自分自身は削除できません'); return }
    if (confirm(`「${name}」を削除しますか？`)) deleteMutation.mutate(id)
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">社員マスタ</h1>
        <button className="btn btn-primary" onClick={() => navigate('/employees/new')}>+ 新規登録</button>
      </div>

      <div className="card mb-4">
        <div className="toolbar">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">ロール絞り込み</label>
            <select className="form-control" value={filterRole} onChange={(e) => { setFilterRole(e.target.value as Role | ''); setPage(1) }}>
              <option value="">全員</option>
              <option value="sales">営業担当</option>
              <option value="manager">上長</option>
              <option value="admin">管理者</option>
            </select>
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
                    <th>氏名</th>
                    <th>メール</th>
                    <th>ロール</th>
                    <th>上長</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.length === 0 && (
                    <tr><td colSpan={5} className="text-muted" style={{ textAlign: 'center', padding: '24px' }}>社員がいません</td></tr>
                  )}
                  {data?.data.map((emp) => (
                    <tr key={emp.id}>
                      <td>{emp.name}</td>
                      <td>{emp.email}</td>
                      <td><span className={`badge ${ROLE_BADGE[emp.role]}`}>{ROLE_LABEL[emp.role]}</span></td>
                      <td>{emp.manager?.name ?? '—'}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/employees/${emp.id}/edit`)}>編集</button>
                          {emp.id !== employee?.id && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(emp.id, emp.name)}>削除</button>
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
    </div>
  )
}
