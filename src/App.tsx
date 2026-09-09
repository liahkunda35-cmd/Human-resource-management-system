import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider } from './store/Store'
import { AppLayout, RequireAuth } from './components/Layout'
import { Toasts } from './components/ui'
import { LandingPage } from './pages/Landing'
import { ForgotPasswordPage, LoginPage } from './pages/Login'
import { DashboardPage } from './pages/Dashboard'
import { EmployeeProfilePage, EmployeesPage } from './pages/Employees'
import { AnnouncementsPage, DepartmentsPage } from './pages/Departments'
import { AttendancePage } from './pages/Attendance'
import { LeavePage } from './pages/Leave'
import { PayrollPage } from './pages/Payroll'
import { RecruitmentPage } from './pages/Recruitment'
import { PerformancePage, TasksPage } from './pages/Performance'
import { DocumentsPage, TrainingPage } from './pages/Training'
import { ReportsPage } from './pages/Reports'
import { SettingsPage } from './pages/Settings'

export default function App() {
  return (
    <StoreProvider>
      <div className="app-grain" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="employees" element={<RequireAuth roles={['admin', 'manager']}><EmployeesPage /></RequireAuth>} />
              <Route path="employees/:id" element={<RequireAuth roles={['admin', 'manager']}><EmployeeProfilePage /></RequireAuth>} />
              <Route path="departments" element={<RequireAuth roles={['admin']}><DepartmentsPage /></RequireAuth>} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="leave" element={<LeavePage />} />
              <Route path="payroll" element={<RequireAuth roles={['admin', 'employee']}><PayrollPage /></RequireAuth>} />
              <Route path="recruitment" element={<RequireAuth roles={['admin']}><RecruitmentPage /></RequireAuth>} />
              <Route path="performance" element={<PerformancePage />} />
              <Route path="training" element={<TrainingPage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="announcements" element={<AnnouncementsPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="reports" element={<RequireAuth roles={['admin', 'manager']}><ReportsPage /></RequireAuth>} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toasts />
    </StoreProvider>
  )
}
