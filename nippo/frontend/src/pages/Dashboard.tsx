import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listReports } from '../api/reports'
import { useAuthStore } from '../store/authStore'
import Spinner from '../components/Spinner'

function today(): string {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function thisMonthRange(): { date_from: string; date_to: string } {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(y, d.getMonth() + 1, 0).getDate()
  return { date_from: `${y}-${m}-01`, date_to: `${y}-${m}-${lastDay}` }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { employee } = useAuthStore()
  const role = employee?.role

  const { date_from, date_to } = thisMonthRange()
  const todayStr = today()

  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ['reports', 'recent'],
    queryFn: () => listReports({ per_page: 5, sort: 'report_date', order: 'desc' }),
  })

  const { data: monthData } = useQuery({
    queryKey: ['reports', 'month', date_from],
    queryFn: () => listReports({ per_page: 1, date_from, date_to }),
  })

  const { data: noCommentData } = useQuery({
    queryKey: ['reports', 'nocomment'],
    queryFn: () => listReports({ per_page: 100, sort: 'report_date', order: 'desc' }),
    enabled: role === 'manager' || role === 'admin',
  })

  const { data: todayData } = useQuery({
    queryKey: ['reports', 'today', todayStr],
    queryFn: () => listReports({ date_from: todayStr, date_to: todayStr }),
    enabled: role === 'sales' || role === 'admin',
  })

  const monthCount = monthData?.meta.total ?? 0
  const noCommentCount = noCommentData?.data.filter((r) => !r.has_comment).length ?? 0
  const todayReport = todayData?.data[0]

  const handleTodayBtn = () => {
    if (todayReport) {
      navigate(`/reports/${todayReport.id}/edit`)
    } else {
      navigate('/reports/new')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">ダッシュボード</h1>
        {(role === 'sales' || role === 'admin') && (
          <button className="btn btn-primary" onClick={handleTodayBtn}>
            {todayReport ? '今日の日報を編集' : '今日の日報を作成'}
          </button>
        )}
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">今月の日報件数</div>
          <div className="stat-value">{monthCount}</div>
        </div>
        {(role === 'manager' || role === 'admin') && (
          <div className="stat-card">
            <div className="stat-label">未コメント件数</div>
            <div className="stat-value" style={{ color: noCommentCount > 0 ? '#ef4444' : '#22c55e' }}>
              {noCommentCount}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">最近の日報（直近5件）</div>
        {recentLoading ? (
          <Spinner center dark />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>日付</th>
                  <th>担当者</th>
                  <th>訪問数</th>
                  <th>コメント</th>
                </tr>
              </thead>
              <tbody>
                {recentData?.data.length === 0 && (
                  <tr><td colSpan={4} className="text-muted" style={{ textAlign: 'center', padding: '24px' }}>日報がありません</td></tr>
                )}
                {recentData?.data.map((r) => (
                  <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/reports/${r.id}`)}>
                    <td>{r.report_date}</td>
                    <td>{r.employee.name}</td>
                    <td>{r.visit_count}件</td>
                    <td>
                      <span className={`badge ${r.has_comment ? 'badge-commented' : 'badge-nocomment'}`}>
                        {r.has_comment ? 'あり' : 'なし'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
