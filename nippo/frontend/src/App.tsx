import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PrivateRoute from './components/PrivateRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ReportList from './pages/ReportList'
import ReportForm from './pages/ReportForm'
import ReportDetail from './pages/ReportDetail'
import CustomerList from './pages/CustomerList'
import CustomerForm from './pages/CustomerForm'
import EmployeeList from './pages/EmployeeList'
import EmployeeForm from './pages/EmployeeForm'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<PrivateRoute />}>
        <Route element={<Layout><Navigate to="/dashboard" /></Layout>} path="/" />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/reports" element={<Layout><ReportList /></Layout>} />
        <Route path="/reports/new" element={<Layout><ReportForm /></Layout>} />
        <Route path="/reports/:id/edit" element={<Layout><ReportForm /></Layout>} />
        <Route path="/reports/:id" element={<Layout><ReportDetail /></Layout>} />
        <Route path="/customers" element={<Layout><CustomerList /></Layout>} />
        <Route element={<PrivateRoute allowedRoles={['manager', 'admin']} />}>
          <Route path="/customers/new" element={<Layout><CustomerForm /></Layout>} />
          <Route path="/customers/:id/edit" element={<Layout><CustomerForm /></Layout>} />
        </Route>
        <Route element={<PrivateRoute allowedRoles={['admin']} />}>
          <Route path="/employees" element={<Layout><EmployeeList /></Layout>} />
          <Route path="/employees/new" element={<Layout><EmployeeForm /></Layout>} />
          <Route path="/employees/:id/edit" element={<Layout><EmployeeForm /></Layout>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
