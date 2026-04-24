import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { logout as apiLogout } from '../api/auth'

const ROLE_LABEL: Record<string, string> = { sales: '営業担当', manager: '上長', admin: '管理者' }

export default function Layout({ children }: { children: React.ReactNode }) {
  const { employee, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await apiLogout() } catch { /* ignore */ }
    logout()
    navigate('/login')
  }

  const role = employee?.role

  return (
    <div className="layout">
      <header className="header">
        <span className="header-title">営業日報システム</span>
        <div className="header-user">
          <span>{employee?.name}（{role ? ROLE_LABEL[role] : ''}）</span>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>ログアウト</button>
        </div>
      </header>

      <div className="body-wrap">
        <nav className="sidebar">
          <div className="sidebar-section">メニュー</div>
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>ダッシュボード</NavLink>
          <NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>日報一覧</NavLink>
          <NavLink to="/customers" className={({ isActive }) => isActive ? 'active' : ''}>顧客マスタ</NavLink>
          {role === 'admin' && (
            <NavLink to="/employees" className={({ isActive }) => isActive ? 'active' : ''}>社員マスタ</NavLink>
          )}
        </nav>

        <main className="main">{children}</main>
      </div>

      <footer className="footer">営業日報システム v1.0</footer>
    </div>
  )
}
