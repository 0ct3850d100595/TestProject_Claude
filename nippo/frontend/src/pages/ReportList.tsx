import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listReports } from '../api/reports'
import { listEmployees } from '../api/employees'
import { useAuthStore } from '../store/authStore'
import Spinner from '../components/Spinner'
import Pagination from '../components/Pagination'

function todayString(): string {
  const d = new Date()
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

type SortField = 'report_date' | 'employee_name'
type SortOrder = 'asc' | 'desc'

export default function ReportList() {
  const navigate = useNavigate()
  const { employee } = useAuthStore()
  const role = employee?.role

  const [page, setPage] = useState(1)
  const [employeeId, setEmployeeId] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sort, setSort] = useState<SortField>('report_date')
  const [order, setOrder] = useState<SortOrder>('desc')
  const [applied, setApplied] = useState({ employeeId: '', dateFrom: '', dateTo: '', sort, order })

  const params = {
    page,
    per_page: 20,
    ...(applied.employeeId ? { employee_id: Number(applied.employeeId) } : {}),
    ...(applied.dateFrom ? { date_from: applied.dateFrom } : {}),
    ...(applied.dateTo ? { date_to: applied.dateTo } : {}),
    sort: applied.sort,
    order: applied.order,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['reports', params],
    queryFn: () => listReports(params),
  })

  const { data: empData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => listEmployees({ per_page: 100 }),
    enabled: role === 'manager' || role === 'admin',
  })

  const today = useMemo(() => todayString(), [])
  const { data: todayData } = useQuery({
    queryKey: ['reports', 'today-check', today],
    queryFn: () => listReports({ date_from: today, date_to: today, per_page: 1 }),
    enabled: role === 'sales' || role === 'admin',
  })
  const todayReportId = todayData?.data[0]?.id

  const handleSearch = () => {
    setPage(1)
    setApplied({ employeeId, dateFrom, dateTo, sort, order })
  }

  const handleSort = (field: SortField) => {
    const newOrder = applied.sort === field && applied.order === 'asc' ? 'desc' : 'asc'
    setSort(field)
    setOrder(newOrder)
    setApplied((prev) => ({ ...prev, sort: field, order: newOrder }))
    setPage(1)
  }

  const sortIcon = (field: SortField) => {
    if (applied.sort !== field) return '⇅'
    return applied.order === 'asc' ? '↑' : '↓'
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">日報一覧</h1>
        {(role === 'sales' || role === 'admin') && (
          todayReportId
            ? <button className="btn btn-secondary" onClick={() => navigate(`/reports/${todayReportId}/edit`)}>今日の日報を編集</button>
            : <button className="btn btn-primary" onClick={() => navigate('/reports/new')}>+ 新規作成</button>
        )}
      </div>

      <div className="card mb-4">
        <div className="toolbar">
          {(role === 'manager' || role === 'admin') && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">担当者</label>
              <select className="form-control" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">全員</option>
                {empData?.data.map((e) => (
                  <option key={e.id} value={String(e.id)}>{e.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">開始日</label>
            <input type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">終了日</label>
            <input type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
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
                      <button className={`sort-btn${applied.sort === 'report_date' ? ' active' : ''}`} onClick={() => handleSort('report_date')}>
                        日付 {sortIcon('report_date')}
                      </button>
                    </th>
                    <th>
                      <button className={`sort-btn${applied.sort === 'employee_name' ? ' active' : ''}`} onClick={() => handleSort('employee_name')}>
                        担当者 {sortIcon('employee_name')}
                      </button>
                    </th>
                    <th>訪問数</th>
                    <th>コメント</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.length === 0 && (
                    <tr><td colSpan={5} className="text-muted" style={{ textAlign: 'center', padding: '24px' }}>日報がありません</td></tr>
                  )}
                  {data?.data.map((r) => (
                    <tr key={r.id}>
                      <td>{r.report_date}</td>
                      <td>{r.employee.name}</td>
                      <td>{r.visit_count}件</td>
                      <td>
                        <span className={`badge ${r.has_comment ? 'badge-commented' : 'badge-nocomment'}`}>
                          {r.has_comment ? 'あり' : 'なし'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/reports/${r.id}`)}>詳細</button>
                          {(role === 'admin' || r.employee.id === employee?.id) && (
                            <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/reports/${r.id}/edit`)}>編集</button>
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
