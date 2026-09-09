import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { buildSeed } from '../data/seed'
import {
  hoursBetween,
  isLate,
  leaveDays,
  leaveKey,
  todayISO,
  uid,
} from '../lib/format'
import type {
  Announcement,
  AppState,
  Application,
  AttendanceRecord,
  Department,
  Employee,
  Goal,
  HRDocument,
  Interview,
  LeaveRequest,
  LeaveType,
  OrgSettings,
  PayrollRecord,
  PerformanceReview,
  PipelineStage,
  RequestStatus,
  TrainingProgram,
  Vacancy,
  WorkTask,
} from '../types'
import { fullName } from '../types'

const STATE_KEY = 'zamtech-hrms-v1'
const SESSION_KEY = 'zamtech-hrms-session'
const REMEMBER_KEY = 'zamtech-hrms-remember'

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (raw) return JSON.parse(raw) as AppState
  } catch {
    /* seed */
  }
  return buildSeed()
}

function loadSession(): string | null {
  return sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY)
}

type ToastTone = 'success' | 'error' | 'info'
export interface ToastItem {
  id: string
  message: string
  tone: ToastTone
}

interface StoreValue {
  state: AppState
  currentUser: Employee | null
  toasts: ToastItem[]
  login: (email: string, password: string, remember: boolean) => string | null
  logout: () => void
  toast: (message: string, tone?: ToastTone) => void
  dismissToast: (id: string) => void
  resetDemo: () => void
  updateSettings: (patch: Partial<OrgSettings>) => void
  updateLeaveTypeDays: (type: LeaveType, days: number) => void
  updateProfile: (id: string, patch: Partial<Employee>) => void
  changePassword: (id: string, current: string, next: string) => string | null
  addEmployee: (data: Omit<Employee, 'id' | 'employeeId' | 'password' | 'avatarHue'> & { password?: string }) => Employee
  saveEmployee: (id: string, patch: Partial<Employee>) => void
  deactivateEmployee: (id: string) => void
  addDepartment: (data: Omit<Department, 'id'>) => void
  saveDepartment: (id: string, patch: Partial<Department>) => void
  deleteDepartment: (id: string) => string | null
  addPosition: (title: string, departmentId: string) => void
  deletePosition: (id: string) => void
  clockIn: (employeeId: string) => void
  clockOut: (employeeId: string) => void
  applyLeave: (payload: { employeeId: string; type: LeaveType; startDate: string; endDate: string; reason: string }) => string | null
  reviewLeave: (id: string, status: Exclude<RequestStatus, 'Pending'>, reviewerId: string, note: string) => void
  createPayrollRun: (period: string) => void
  processPayroll: (period: string) => void
  savePayroll: (id: string, patch: Partial<PayrollRecord>) => void
  addVacancy: (data: Omit<Vacancy, 'id' | 'createdAt'>) => void
  saveVacancy: (id: string, patch: Partial<Vacancy>) => void
  deleteVacancy: (id: string) => void
  addApplication: (data: Omit<Application, 'id' | 'appliedAt'>) => void
  moveApplication: (id: string, stage: PipelineStage) => void
  scheduleInterview: (data: Omit<Interview, 'id'>) => void
  addReview: (data: Omit<PerformanceReview, 'id' | 'createdAt'>) => void
  addGoal: (data: Omit<Goal, 'id'>) => void
  updateGoal: (id: string, patch: Partial<Goal>) => void
  addTraining: (data: Omit<TrainingProgram, 'id'>) => void
  assignTraining: (trainingId: string, employeeId: string) => void
  updateTrainingProgress: (id: string, progress: number) => void
  addDocument: (data: Omit<HRDocument, 'id' | 'uploadedAt'>) => void
  deleteDocument: (id: string) => void
  addAnnouncement: (data: Omit<Announcement, 'id' | 'date' | 'authorId'>, authorId: string) => void
  deleteAnnouncement: (id: string) => void
  addTask: (data: Omit<WorkTask, 'id'>) => void
  updateTask: (id: string, patch: Partial<WorkTask>) => void
  deleteTask: (id: string) => void
  markNotificationRead: (id: string) => void
  markAllRead: (userId: string) => void
}

const StoreContext = createContext<StoreValue | null>(null)

function persist(state: AppState) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state))
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState())
  const [userId, setUserId] = useState<string | null>(() => loadSession())
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    persist(state)
  }, [state])

  const currentUser = useMemo(
    () => state.employees.find((e) => e.id === userId) ?? null,
    [state.employees, userId],
  )

  const toast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = uid('toast')
    setToasts((t) => [...t, { id, message, tone }])
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 3800)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const notify = useCallback((userId: string, title: string, body: string, type: string) => {
    setState((s) => ({
      ...s,
      notifications: [
        {
          id: uid('n'),
          userId,
          title,
          body,
          type,
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...s.notifications,
      ],
    }))
  }, [])

  const activity = useCallback((text: string, kind: string) => {
    setState((s) => ({
      ...s,
      activities: [{ id: uid('ac'), text, time: new Date().toISOString(), kind }, ...s.activities].slice(0, 40),
    }))
  }, [])

  const login = useCallback((email: string, password: string, remember: boolean) => {
    const emp = state.employees.find(
      (e) => e.email.toLowerCase() === email.trim().toLowerCase() && e.password === password,
    )
    if (!emp) return 'Those details do not match our records.'
    if (emp.status === 'Inactive') return 'This account has been deactivated. Speak to Human Resources.'
    setUserId(emp.id)
    sessionStorage.setItem(SESSION_KEY, emp.id)
    if (remember) {
      localStorage.setItem(SESSION_KEY, emp.id)
      localStorage.setItem(REMEMBER_KEY, '1')
    } else {
      localStorage.removeItem(SESSION_KEY)
      localStorage.removeItem(REMEMBER_KEY)
    }
    return null
  }, [state.employees])

  const logout = useCallback(() => {
    setUserId(null)
    sessionStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(SESSION_KEY)
  }, [])

  const resetDemo = useCallback(() => {
    const fresh = buildSeed()
    setState(fresh)
    toast('Demo data restored.')
  }, [toast])

  const updateSettings = useCallback((patch: Partial<OrgSettings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
    toast('Organisation settings saved.')
  }, [toast])

  const updateLeaveTypeDays = useCallback((type: LeaveType, days: number) => {
    setState((s) => ({ ...s, leaveTypeDays: { ...s.leaveTypeDays, [type]: days } }))
  }, [])

  const updateProfile = useCallback((id: string, patch: Partial<Employee>) => {
    setState((s) => ({
      ...s,
      employees: s.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }))
    toast('Profile updated.')
  }, [toast])

  const changePassword = useCallback((id: string, current: string, next: string) => {
    const emp = state.employees.find((e) => e.id === id)
    if (!emp) return 'Account not found.'
    if (emp.password !== current) return 'Current password is incorrect.'
    if (next.length < 8) return 'Use at least 8 characters.'
    setState((s) => ({
      ...s,
      employees: s.employees.map((e) => (e.id === id ? { ...e, password: next } : e)),
    }))
    toast('Password updated.')
    return null
  }, [state.employees, toast])

  const addEmployee = useCallback((data: Omit<Employee, 'id' | 'employeeId' | 'password' | 'avatarHue'> & { password?: string }) => {
    const year = new Date().getFullYear().toString().slice(2)
    const emp: Employee = {
      ...data,
      id: uid('e'),
      employeeId: `ZTS-${year}${Math.floor(100 + Math.random() * 899)}`,
      password: data.password || 'Aurelia@2026',
      avatarHue: Math.floor(Math.random() * 360),
    }
    setState((s) => ({ ...s, employees: [emp, ...s.employees], leaveBalances: [...s.leaveBalances, {
      employeeId: emp.id,
      annual: s.leaveTypeDays['Annual Leave'],
      sick: s.leaveTypeDays['Sick Leave'],
      maternity: emp.gender === 'Female' ? s.leaveTypeDays['Maternity Leave'] : 0,
      paternity: emp.gender === 'Male' ? s.leaveTypeDays['Paternity Leave'] : 0,
      emergency: s.leaveTypeDays['Emergency Leave'],
      unpaid: s.leaveTypeDays['Unpaid Leave'],
    }] }))
    state.employees
      .filter((e) => e.role === 'admin')
      .forEach((a) => notify(a.id, 'New employee added', `${fullName(emp)} has been added to the directory.`, 'employee'))
    activity(`${fullName(emp)} joined ${data.position}`, 'employee')
    toast('Employee added successfully.')
    return emp
  }, [activity, notify, state.employees, toast])

  const saveEmployee = useCallback((id: string, patch: Partial<Employee>) => {
    setState((s) => ({
      ...s,
      employees: s.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }))
    toast('Employee updated successfully.')
  }, [toast])

  const deactivateEmployee = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      employees: s.employees.map((e) => (e.id === id ? { ...e, status: 'Inactive' as const } : e)),
    }))
    toast('Employee deleted successfully.')
  }, [toast])

  const addDepartment = useCallback((data: Omit<Department, 'id'>) => {
    setState((s) => ({ ...s, departments: [...s.departments, { ...data, id: uid('d') }] }))
    toast('Department created.')
  }, [toast])

  const saveDepartment = useCallback((id: string, patch: Partial<Department>) => {
    setState((s) => ({
      ...s,
      departments: s.departments.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }))
    toast('Department updated.')
  }, [toast])

  const deleteDepartment = useCallback((id: string) => {
    if (state.employees.some((e) => e.departmentId === id && e.status !== 'Inactive')) {
      return 'Move or deactivate employees before deleting this department.'
    }
    setState((s) => ({ ...s, departments: s.departments.filter((d) => d.id !== id) }))
    toast('Department removed.')
    return null
  }, [state.employees, toast])

  const addPosition = useCallback((title: string, departmentId: string) => {
    setState((s) => ({ ...s, positions: [...s.positions, { id: uid('p'), title, departmentId }] }))
    toast('Position added.')
  }, [toast])

  const deletePosition = useCallback((id: string) => {
    setState((s) => ({ ...s, positions: s.positions.filter((p) => p.id !== id) }))
  }, [])

  const clockIn = useCallback((employeeId: string) => {
    const date = todayISO()
    const time = new Date()
    const hhmm = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`
    const existing = state.attendance.find((a) => a.employeeId === employeeId && a.date === date)
    if (existing?.clockIn && !existing.clockOut) {
      toast('You are already clocked in.', 'info')
      return
    }
    if (existing?.clockOut) {
      toast('You have already completed attendance for today.', 'info')
      return
    }
    setState((s) => {
      const current = s.attendance.find((a) => a.employeeId === employeeId && a.date === date)
      const status = isLate(hhmm, s.settings.workStart) ? 'Late' : 'Present'
      const record: AttendanceRecord = current
        ? { ...current, clockIn: hhmm, status }
        : {
            id: uid('a'),
            employeeId,
            date,
            clockIn: hhmm,
            clockOut: null,
            breakMinutes: 0,
            hours: 0,
            status,
            note: '',
          }
      const attendance = current
        ? s.attendance.map((a) => (a.id === current.id ? record : a))
        : [record, ...s.attendance]
      return { ...s, attendance }
    })
    const emp = state.employees.find((e) => e.id === employeeId)
    if (emp) activity(`${fullName(emp)} clocked in`, 'attendance')
    toast('Clocked in successfully.')
  }, [activity, state.attendance, state.employees, toast])

  const clockOut = useCallback((employeeId: string) => {
    const date = todayISO()
    const time = new Date()
    const hhmm = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`
    const existing = state.attendance.find((a) => a.employeeId === employeeId && a.date === date)
    if (!existing?.clockIn) {
      toast('Clock in before you clock out.', 'error')
      return
    }
    if (existing.clockOut) {
      toast('You have already clocked out.', 'info')
      return
    }
    const hours = hoursBetween(existing.clockIn, hhmm, existing.breakMinutes || 45)
    setState((s) => ({
      ...s,
      attendance: s.attendance.map((a) =>
        a.id === existing.id ? { ...a, clockOut: hhmm, hours, breakMinutes: a.breakMinutes || 45 } : a,
      ),
    }))
    toast('Clocked out successfully.')
  }, [state.attendance, toast])

  const applyLeave = useCallback((payload: { employeeId: string; type: LeaveType; startDate: string; endDate: string; reason: string }) => {
    if (!payload.startDate || !payload.endDate) return 'Choose start and end dates.'
    if (payload.endDate < payload.startDate) return 'End date cannot be before the start date.'
    if (!payload.reason.trim()) return 'Please share a short reason.'
    const days = leaveDays(payload.startDate, payload.endDate)
    const balance = state.leaveBalances.find((b) => b.employeeId === payload.employeeId)
    const key = leaveKey(payload.type)
    if (balance && balance[key] < days && payload.type !== 'Unpaid Leave') {
      return `Only ${balance[key]} day(s) remaining for ${payload.type}.`
    }
    const overlap = state.leaveRequests.some(
      (r) =>
        r.employeeId === payload.employeeId &&
        r.status !== 'Rejected' &&
        r.startDate <= payload.endDate &&
        r.endDate >= payload.startDate,
    )
    if (overlap) return 'This overlaps an existing leave request.'
    const req: LeaveRequest = {
      id: uid('l'),
      ...payload,
      days,
      status: 'Pending',
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: '',
      createdAt: new Date().toISOString(),
    }
    setState((s) => ({ ...s, leaveRequests: [req, ...s.leaveRequests] }))
    const emp = state.employees.find((e) => e.id === payload.employeeId)
    state.employees
      .filter((e) => e.role === 'admin' || e.id === emp?.managerId)
      .forEach((e) => notify(e.id, 'Leave request awaiting review', `${emp ? fullName(emp) : 'An employee'} requested ${payload.type}.`, 'leave'))
    if (emp) activity(`${fullName(emp)} submitted a ${payload.type.toLowerCase()} request`, 'leave')
    toast('Leave request submitted.')
    return null
  }, [activity, notify, state.employees, state.leaveBalances, state.leaveRequests, toast])

  const reviewLeave = useCallback((id: string, status: Exclude<RequestStatus, 'Pending'>, reviewerId: string, note: string) => {
    const req = state.leaveRequests.find((r) => r.id === id)
    if (!req) return
    setState((s) => {
      let leaveBalances = s.leaveBalances
      if (status === 'Approved') {
        const key = leaveKey(req.type)
        leaveBalances = s.leaveBalances.map((b) =>
          b.employeeId === req.employeeId ? { ...b, [key]: Math.max(0, b[key] - req.days) } : b,
        )
      }
      return {
        ...s,
        leaveBalances,
        leaveRequests: s.leaveRequests.map((r) =>
          r.id === id
            ? { ...r, status, reviewedBy: reviewerId, reviewedAt: new Date().toISOString(), reviewNote: note }
            : r,
        ),
      }
    })
    notify(
      req.employeeId,
      status === 'Approved' ? 'Leave approved' : 'Leave rejected',
      `${req.type} (${req.startDate} – ${req.endDate}) was ${status.toLowerCase()}.`,
      'leave',
    )
    toast(status === 'Approved' ? 'Leave request approved.' : 'Leave request rejected.')
  }, [notify, state.leaveRequests, toast])

  const createPayrollRun = useCallback((period: string) => {
    if (!period) {
      toast('Select a payroll period.', 'error')
      return
    }
    const exists = state.payrolls.some((p) => p.period === period)
    if (exists) {
      toast('A payroll run already exists for that period.', 'error')
      return
    }
    setState((s) => {
      const payrolls = s.employees
        .filter((e) => e.status !== 'Inactive')
        .map((e) => {
          const deductions = Math.round(e.basicSalary * 0.02)
          const allowances = e.housingAllowance + e.transportAllowance + e.otherAllowance
          const tax = Math.round((e.basicSalary + allowances) * e.taxRate)
          return {
            id: uid('pay'),
            employeeId: e.id,
            period,
            basicSalary: e.basicSalary,
            housing: e.housingAllowance,
            transport: e.transportAllowance,
            other: e.otherAllowance,
            deductions,
            tax,
            net: e.basicSalary + allowances - deductions - tax,
            status: 'Draft' as const,
            processedAt: null,
          }
        })
      return { ...s, payrolls: [...payrolls, ...s.payrolls] }
    })
    toast('Payroll created successfully.')
  }, [state.payrolls, toast])

  const processPayroll = useCallback((period: string) => {
    const rows = state.payrolls.filter((p) => p.period === period)
    if (!rows.length) {
      toast('Create a payroll run before processing.', 'error')
      return
    }
    setState((s) => ({
      ...s,
      payrolls: s.payrolls.map((p) =>
        p.period === period ? { ...p, status: 'Paid' as const, processedAt: new Date().toISOString() } : p,
      ),
    }))
    state.employees.forEach((e) => {
      if (e.status !== 'Inactive') {
        notify(e.id, 'Payslip available', `Your payslip for ${period} is ready.`, 'payroll')
      }
    })
    activity('Payroll processed', 'payroll')
    toast('Payroll processed successfully.')
  }, [activity, notify, state.employees, state.payrolls, toast])

  const savePayroll = useCallback((id: string, patch: Partial<PayrollRecord>) => {
    setState((s) => ({
      ...s,
      payrolls: s.payrolls.map((p) => {
        if (p.id !== id) return p
        const next = { ...p, ...patch }
        const allowances = next.housing + next.transport + next.other
        next.net = next.basicSalary + allowances - next.deductions - next.tax
        return next
      }),
    }))
    toast('Payslip updated.')
  }, [toast])

  const addVacancy = useCallback((data: Omit<Vacancy, 'id' | 'createdAt'>) => {
    setState((s) => ({
      ...s,
      vacancies: [{ ...data, id: uid('v'), createdAt: todayISO() }, ...s.vacancies],
    }))
    toast('Vacancy published.')
  }, [toast])

  const saveVacancy = useCallback((id: string, patch: Partial<Vacancy>) => {
    setState((s) => ({
      ...s,
      vacancies: s.vacancies.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    }))
    toast('Vacancy updated.')
  }, [toast])

  const deleteVacancy = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      vacancies: s.vacancies.filter((v) => v.id !== id),
      applications: s.applications.filter((a) => a.vacancyId !== id),
    }))
    toast('Vacancy removed.')
  }, [toast])

  const addApplication = useCallback((data: Omit<Application, 'id' | 'appliedAt'>) => {
    setState((s) => ({
      ...s,
      applications: [{ ...data, id: uid('ap'), appliedAt: todayISO() }, ...s.applications],
    }))
    state.employees.filter((e) => e.role === 'admin').forEach((e) => {
      notify(e.id, 'New application', `${data.candidateName} applied.`, 'recruitment')
    })
    toast('Application recorded.')
  }, [notify, state.employees, toast])

  const moveApplication = useCallback((id: string, stage: PipelineStage) => {
    setState((s) => ({
      ...s,
      applications: s.applications.map((a) => (a.id === id ? { ...a, stage } : a)),
    }))
    toast(`Moved to ${stage}.`)
  }, [toast])

  const scheduleInterview = useCallback((data: Omit<Interview, 'id'>) => {
    setState((s) => ({
      ...s,
      interviews: [...s.interviews, { ...data, id: uid('i') }],
      applications: s.applications.map((a) => (a.id === data.applicationId ? { ...a, stage: 'Interview' as const } : a)),
    }))
    toast('Interview scheduled.')
  }, [toast])

  const addReview = useCallback((data: Omit<PerformanceReview, 'id' | 'createdAt'>) => {
    setState((s) => ({
      ...s,
      reviews: [{ ...data, id: uid('r'), createdAt: todayISO() }, ...s.reviews],
    }))
    notify(data.employeeId, 'Performance review completed', `A review for ${data.period} is ready.`, 'performance')
    activity('Performance review completed', 'performance')
    toast('Review saved.')
  }, [activity, notify, toast])

  const addGoal = useCallback((data: Omit<Goal, 'id'>) => {
    setState((s) => ({ ...s, goals: [...s.goals, { ...data, id: uid('g') }] }))
    toast('Goal added.')
  }, [toast])

  const updateGoal = useCallback((id: string, patch: Partial<Goal>) => {
    setState((s) => ({ ...s, goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }))
  }, [])

  const addTraining = useCallback((data: Omit<TrainingProgram, 'id'>) => {
    setState((s) => ({ ...s, trainings: [{ ...data, id: uid('t') }, ...s.trainings] }))
    toast('Training programme created.')
  }, [toast])

  const assignTraining = useCallback((trainingId: string, employeeId: string) => {
    setState((s) => {
      if (s.trainingAssignments.some((a) => a.trainingId === trainingId && a.employeeId === employeeId)) return s
      return {
        ...s,
        trainingAssignments: [
          ...s.trainingAssignments,
          { id: uid('ta'), trainingId, employeeId, progress: 0, completed: false, certificate: false },
        ],
      }
    })
    notify(employeeId, 'Training assigned', 'A new programme has been added to your learning plan.', 'training')
    toast('Employee assigned.')
  }, [notify, toast])

  const updateTrainingProgress = useCallback((id: string, progress: number) => {
    setState((s) => ({
      ...s,
      trainingAssignments: s.trainingAssignments.map((a) =>
        a.id === id
          ? { ...a, progress, completed: progress >= 100, certificate: progress >= 100 }
          : a,
      ),
    }))
  }, [])

  const addDocument = useCallback((data: Omit<HRDocument, 'id' | 'uploadedAt'>) => {
    setState((s) => ({
      ...s,
      documents: [{ ...data, id: uid('doc'), uploadedAt: todayISO() }, ...s.documents],
    }))
    toast('Document uploaded.')
  }, [toast])

  const deleteDocument = useCallback((id: string) => {
    setState((s) => ({ ...s, documents: s.documents.filter((d) => d.id !== id) }))
    toast('Document removed.')
  }, [toast])

  const addAnnouncement = useCallback((data: Omit<Announcement, 'id' | 'date' | 'authorId'>, authorId: string) => {
    setState((s) => ({
      ...s,
      announcements: [{ ...data, id: uid('an'), date: todayISO(), authorId }, ...s.announcements],
    }))
    state.employees.forEach((e) => {
      if (e.id !== authorId && e.status !== 'Inactive') {
        notify(e.id, 'New announcement', data.title, 'announcement')
      }
    })
    toast('Announcement published.')
  }, [notify, state.employees, toast])

  const deleteAnnouncement = useCallback((id: string) => {
    setState((s) => ({ ...s, announcements: s.announcements.filter((a) => a.id !== id) }))
    toast('Announcement removed.')
  }, [toast])

  const addTask = useCallback((data: Omit<WorkTask, 'id'>) => {
    setState((s) => ({ ...s, tasks: [{ ...data, id: uid('tk') }, ...s.tasks] }))
    notify(data.assigneeId, 'Task assigned', data.title, 'task')
    toast('Task assigned.')
  }, [notify, toast])

  const updateTask = useCallback((id: string, patch: Partial<WorkTask>) => {
    setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
  }, [])

  const deleteTask = useCallback((id: string) => {
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }))
  }, [])

  const markNotificationRead = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }))
  }, [])

  const markAllRead = useCallback((uidUser: string) => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => (n.userId === uidUser ? { ...n, read: true } : n)),
    }))
  }, [])

  const value: StoreValue = {
    state,
    currentUser,
    toasts,
    login,
    logout,
    toast,
    dismissToast,
    resetDemo,
    updateSettings,
    updateLeaveTypeDays,
    updateProfile,
    changePassword,
    addEmployee,
    saveEmployee,
    deactivateEmployee,
    addDepartment,
    saveDepartment,
    deleteDepartment,
    addPosition,
    deletePosition,
    clockIn,
    clockOut,
    applyLeave,
    reviewLeave,
    createPayrollRun,
    processPayroll,
    savePayroll,
    addVacancy,
    saveVacancy,
    deleteVacancy,
    addApplication,
    moveApplication,
    scheduleInterview,
    addReview,
    addGoal,
    updateGoal,
    addTraining,
    assignTraining,
    updateTrainingProgress,
    addDocument,
    deleteDocument,
    addAnnouncement,
    deleteAnnouncement,
    addTask,
    updateTask,
    deleteTask,
    markNotificationRead,
    markAllRead,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
