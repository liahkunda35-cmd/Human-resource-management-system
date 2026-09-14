import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider, useStore } from './store/Store'
import { AppLayout, RequireAuth } from './components/Layout'
import { Toasts } from './components/ui'
import { LandingPage } from './pages/Landing'
import { ForgotPasswordPage, LoginPage, ResetPasswordPage } from './pages/Login'
import { DashboardPage } from './pages/Dashboard'
import { EmployeeProfilePage, EmployeesPage } from './pages/Employees'
import { DepartmentsPage } from './pages/Departments'
import { AttendancePage } from './pages/Attendance'
import { LeavePage } from './pages/Leave'
import { ReportsPage } from './pages/Reports'
import { InternshipsPage } from './pages/Internships'
import { UsersPage } from './pages/Users'
import { AdminsPage } from './pages/Admins'
import { ChangePasswordPage } from './pages/ChangePassword'
import {
  NotificationsPage,
  PayslipsPage,
  PayrollPage,
  PerformancePage,
  ProfilePage,
  RecruitmentPage,
  SettingsPage,
} from './pages/PortalExtras'

function PasswordGate({ children }: { children: React.ReactNode }) {
  const { currentUser, authLoading } = useStore()
  if (authLoading) {
    return (
      <div className="card empty" style={{ margin: 40 }}>
        <h3>Loading session…</h3>
      </div>
    )
  }
  if (currentUser?.mustChangePassword) {
    return <Navigate to="/change-password" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <StoreProvider>
      <div className="app-grain" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          {/* Legacy public registration URLs — no registration form */}
          <Route path="/signup" element={<Navigate to="/login" replace />} />
          <Route path="/sign-up" element={<Navigate to="/login" replace />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route element={<RequireAuth />}>
            <Route
              path="/app"
              element={
                <PasswordGate>
                  <AppLayout />
                </PasswordGate>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="profile" element={<RequireAuth roles={['employee', 'admin', 'manager', 'super_admin']}><ProfilePage /></RequireAuth>} />
              <Route path="employees" element={<RequireAuth roles={['admin', 'manager', 'super_admin']}><EmployeesPage /></RequireAuth>} />
              <Route path="employees/:id" element={<RequireAuth roles={['admin', 'manager', 'super_admin']}><EmployeeProfilePage /></RequireAuth>} />
              <Route path="departments" element={<RequireAuth roles={['admin', 'super_admin']}><DepartmentsPage /></RequireAuth>} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="leave" element={<LeavePage />} />
              <Route path="payslips" element={<RequireAuth roles={['employee']}><PayslipsPage /></RequireAuth>} />
              <Route path="payroll" element={<RequireAuth roles={['admin', 'manager', 'super_admin']}><PayrollPage /></RequireAuth>} />
              <Route path="recruitment" element={<RequireAuth roles={['admin', 'manager', 'super_admin']}><RecruitmentPage /></RequireAuth>} />
              <Route path="performance" element={<RequireAuth roles={['admin', 'manager', 'super_admin']}><PerformancePage /></RequireAuth>} />
              <Route path="internships" element={<InternshipsPage />} />
              <Route path="reports" element={<RequireAuth roles={['admin', 'manager', 'super_admin']}><ReportsPage /></RequireAuth>} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="admins" element={<RequireAuth roles={['super_admin']}><AdminsPage /></RequireAuth>} />
              <Route path="users" element={<RequireAuth roles={['admin']}><UsersPage /></RequireAuth>} />
              <Route path="settings" element={<RequireAuth roles={['admin', 'manager', 'super_admin']}><SettingsPage /></RequireAuth>} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toasts />
    </StoreProvider>
  )
}
