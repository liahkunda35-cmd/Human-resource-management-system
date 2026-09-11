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
  AppState,
  AttendanceRecord,
  Department,
  Employee,
  LeaveRequest,
  LeaveType,
  OrgSettings,
  RequestStatus,
} from '../types'
import { fullName } from '../types'

const STATE_KEY = 'zamtech-hrms-v2'
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
