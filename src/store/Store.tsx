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
  Internship,
  InternshipApplication,
  InternshipApplicationStatus,
  InternshipStatus,
  LeaveRequest,
  LeaveType,
  OrgSettings,
  PasswordResetToken,
  RequestStatus,
  Role,
} from '../types'
import { fullName } from '../types'
import {
  buildResetPath,
  buildResetUrl,
  delay,
  generateResetToken,
  hashToken,
  isValidEmailFormat,
  RESET_TOKENS_KEY,
  resetTokenExpiresAt,
  sendPasswordResetEmail,
} from '../lib/passwordReset'
import { apiRequest, ApiError, getToken, setToken } from '../services/api'
import type { ApiUser } from '../services/api'
import { apiUserToEmployee } from '../services/mappers'

const STATE_KEY = 'zamtech-hrms-v3'
const LEGACY_STATE_KEY = 'zamtech-hrms-v2'
const SESSION_KEY = 'zamtech-hrms-session'
const REMEMBER_KEY = 'zamtech-hrms-remember'

function readResetTokens(): PasswordResetToken[] {
  try {
    const raw = localStorage.getItem(RESET_TOKENS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PasswordResetToken[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeResetTokens(tokens: PasswordResetToken[]) {
  localStorage.setItem(RESET_TOKENS_KEY, JSON.stringify(tokens))
}

function mergeResetTokens(fromState: PasswordResetToken[]): PasswordResetToken[] {
  const fromDisk = readResetTokens()
  const byId = new Map<string, PasswordResetToken>()
  for (const t of fromDisk) byId.set(t.id, t)
  for (const t of fromState) byId.set(t.id, t)
  return Array.from(byId.values())
}

function normalizeState(raw: Partial<AppState>): AppState {
  const seed = buildSeed()
  const leaveRequests = (raw.leaveRequests ?? seed.leaveRequests).map((r) => ({
    ...r,
    sickNoteName: r.sickNoteName ?? null,
    sickNoteData: r.sickNoteData ?? null,
    sickNoteMime: r.sickNoteMime ?? null,
  }))
  return {
    ...seed,
    ...raw,
    leaveRequests,
    internships: raw.internships ?? seed.internships,
    internshipApplications: raw.internshipApplications ?? seed.internshipApplications,
    passwordResetTokens: mergeResetTokens(raw.passwordResetTokens ?? []),
  }
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STATE_KEY) ?? localStorage.getItem(LEGACY_STATE_KEY)
    if (raw) return normalizeState(JSON.parse(raw) as Partial<AppState>)
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
  authLoading: boolean
  apiEnabled: boolean
  toasts: ToastItem[]
  login: (email: string, password: string, remember: boolean) => Promise<string | null | { mustChangePassword: true }>
  logout: () => void
  toast: (message: string, tone?: ToastTone) => void
  dismissToast: (id: string) => void
  resetDemo: () => void
  updateSettings: (patch: Partial<OrgSettings>) => void
  updateLeaveTypeDays: (type: LeaveType, days: number) => void
  updateProfile: (id: string, patch: Partial<Employee>) => void
  changePassword: (id: string, current: string, next: string) => Promise<string | null>
  requestPasswordReset: (email: string) => Promise<
    { ok: true; resetPath?: string } | { ok: false; error: string }
  >
  getResetTokenStatus: (rawToken: string) => Promise<'valid' | 'invalid' | 'expired' | 'used'>
  resetPasswordWithToken: (rawToken: string, nextPassword: string) => Promise<string | null>
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
  applyLeave: (payload: {
    employeeId: string
    type: LeaveType
    startDate: string
    endDate: string
    reason: string
    sickNoteName?: string | null
    sickNoteData?: string | null
    sickNoteMime?: string | null
  }) => string | null
  reviewLeave: (id: string, status: Exclude<RequestStatus, 'Pending'>, reviewerId: string, note: string) => void
  attachSickNote: (leaveId: string, file: { name: string; data: string; mime: string }, actorId: string) => string | null
  canViewSickNote: (leaveId: string) => boolean
  getSickNote: (leaveId: string) => { name: string; data: string; mime: string } | null
  setUserRole: (employeeId: string, role: Role) => string | null
  createManagedUser: (payload: {
    firstName: string
    lastName: string
    email: string
    phone: string
    role: Role
    departmentId: string
    position: string
    password: string
  }) => string | null
  createAdminAccount: (payload: {
    firstName: string
    lastName: string
    email: string
    phone: string
    position?: string
    departmentId?: string
  }) => Promise<{ error?: string; warning?: string }>
  createEmployeeAccount: (payload: {
    firstName: string
    lastName: string
    email: string
    phone: string
    position?: string
    departmentId?: string
  }) => Promise<{ error?: string; warning?: string }>
  resendAdminCredentials: (userId: string) => Promise<{ error?: string; warning?: string }>
  resendEmployeeCredentials: (userId: string) => Promise<{ error?: string; warning?: string }>
  refreshDirectory: () => Promise<void>
  saveInternship: (payload: Omit<Internship, 'id' | 'createdAt' | 'createdBy'> & { id?: string }, actorId: string) => string | null
  setInternshipStatus: (id: string, status: InternshipStatus) => void
  deleteInternship: (id: string) => void
  applyInternship: (payload: {
    internshipId: string
    applicantId: string
    name: string
    email: string
    phone: string
    message: string
    cvName?: string | null
    cvData?: string | null
    cvMime?: string | null
  }) => string | null
  reviewInternshipApplication: (
    id: string,
    status: InternshipApplicationStatus,
    reviewerId: string,
  ) => void
  markNotificationRead: (id: string) => void
  markAllRead: (userId: string) => void
}

const StoreContext = createContext<StoreValue | null>(null)

function persist(state: AppState) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state))
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState())
  const [userId, setUserId] = useState<string | null>(() => (getToken() ? null : loadSession()))
  const [authLoading, setAuthLoading] = useState(() => Boolean(getToken()))
  const [apiEnabled] = useState(true)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    persist(state)
    if (state.passwordResetTokens) writeResetTokens(state.passwordResetTokens)
  }, [state])

  const mergeApiUsers = useCallback((users: ApiUser[]) => {
    const mapped = users.map(apiUserToEmployee)
    setState((s) => {
      const byId = new Map(s.employees.map((e) => [e.id, e]))
      for (const emp of mapped) byId.set(emp.id, { ...byId.get(emp.id), ...emp, password: '' })
      return { ...s, employees: Array.from(byId.values()) }
    })
  }, [])

  const upsertApiUser = useCallback((user: ApiUser) => {
    const emp = apiUserToEmployee(user)
    setState((s) => {
      const others = s.employees.filter((e) => e.id !== emp.id)
      return { ...s, employees: [emp, ...others] }
    })
    return emp
  }, [])

  const refreshDirectory = useCallback(async () => {
    if (!getToken()) return
    try {
      const me = await apiRequest<{ user: ApiUser }>('/auth/me')
      upsertApiUser(me.user)
      setUserId(me.user.id)
      if (me.user.role === 'super_admin') {
        const admins = await apiRequest<{ users: ApiUser[] }>('/admins')
        mergeApiUsers(admins.users)
      }
      if (me.user.role === 'admin' || me.user.role === 'super_admin' || me.user.role === 'manager') {
        try {
          const employees = await apiRequest<{ users: ApiUser[] }>('/employees')
          mergeApiUsers(employees.users)
        } catch {
          /* managers without employee list access */
        }
      }
    } catch {
      setToken(null)
      setUserId(null)
    }
  }, [mergeApiUsers, upsertApiUser])

  useEffect(() => {
    let cancelled = false
    async function boot() {
      if (!getToken()) {
        setAuthLoading(false)
        return
      }
      try {
        await refreshDirectory()
      } finally {
        if (!cancelled) setAuthLoading(false)
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [refreshDirectory])

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

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    try {
      const data = await apiRequest<{ token: string; user: ApiUser }>('/auth/login', {
        method: 'POST',
        json: { email, password },
      })
      setToken(data.token, remember)
      const emp = upsertApiUser(data.user)
      setUserId(emp.id)
      sessionStorage.setItem(SESSION_KEY, emp.id)
      if (remember) {
        localStorage.setItem(SESSION_KEY, emp.id)
        localStorage.setItem(REMEMBER_KEY, '1')
      } else {
        localStorage.removeItem(SESSION_KEY)
        localStorage.removeItem(REMEMBER_KEY)
      }
      try {
        await refreshDirectory()
      } catch {
        /* directory refresh optional after login */
      }
      if (data.user.mustChangePassword) return { mustChangePassword: true as const }
      return null
    } catch (err) {
      if (err instanceof ApiError) return err.message
      return 'Unable to reach the authentication server. Confirm the API is running.'
    }
  }, [refreshDirectory, upsertApiUser])

  const logout = useCallback(() => {
    setUserId(null)
    setToken(null)
    sessionStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(SESSION_KEY)
    void apiRequest('/auth/logout', { method: 'POST' }).catch(() => undefined)
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
    const { role: _role, password: _password, ...safe } = patch
    setState((s) => ({
      ...s,
      employees: s.employees.map((e) => (e.id === id ? { ...e, ...safe } : e)),
    }))
    toast('Profile updated.')
  }, [toast])

  const changePassword = useCallback(async (_id: string, current: string, next: string) => {
    try {
      const data = await apiRequest<{ token: string; user: ApiUser }>('/auth/change-password', {
        method: 'POST',
        json: { currentPassword: current, newPassword: next },
      })
      setToken(data.token, true)
      upsertApiUser(data.user)
      toast('Password updated.')
      return null
    } catch (err) {
      if (err instanceof ApiError) return err.message
      return 'Could not update password.'
    }
  }, [toast, upsertApiUser])

  const createAdminAccount = useCallback(async (payload: {
    firstName: string
    lastName: string
    email: string
    phone: string
    position?: string
    departmentId?: string
  }) => {
    try {
      const data = await apiRequest<{ user: ApiUser; emailSent: boolean; warning?: string }>('/admins', {
        method: 'POST',
        json: payload,
      })
      upsertApiUser(data.user)
      if (data.warning) {
        toast(data.warning, 'info')
        return { warning: data.warning }
      }
      toast('Administrator created. Login credentials were emailed via Nexus.')
      return {}
    } catch (err) {
      return { error: err instanceof ApiError ? err.message : 'Could not create administrator.' }
    }
  }, [toast, upsertApiUser])

  const createEmployeeAccount = useCallback(async (payload: {
    firstName: string
    lastName: string
    email: string
    phone: string
    position?: string
    departmentId?: string
  }) => {
    try {
      const data = await apiRequest<{ user: ApiUser; emailSent: boolean; warning?: string }>('/employees', {
        method: 'POST',
        json: payload,
      })
      upsertApiUser(data.user)
      if (data.warning) {
        toast(data.warning, 'info')
        return { warning: data.warning }
      }
      toast('Employee created. Login credentials were emailed via Nexus.')
      return {}
    } catch (err) {
      return { error: err instanceof ApiError ? err.message : 'Could not create employee.' }
    }
  }, [toast, upsertApiUser])

  const resendAdminCredentials = useCallback(async (userId: string) => {
    try {
      const data = await apiRequest<{ warning?: string }>(`/admins/${userId}/resend-credentials`, {
        method: 'POST',
      })
      if (data.warning) {
        toast(data.warning, 'info')
        return { warning: data.warning }
      }
      toast('New temporary credentials were emailed.')
      return {}
    } catch (err) {
      return { error: err instanceof ApiError ? err.message : 'Could not resend credentials.' }
    }
  }, [toast])

  const resendEmployeeCredentials = useCallback(async (userId: string) => {
    try {
      const data = await apiRequest<{ warning?: string }>(`/employees/${userId}/resend-credentials`, {
        method: 'POST',
      })
      if (data.warning) {
        toast(data.warning, 'info')
        return { warning: data.warning }
      }
      toast('New temporary credentials were emailed.')
      return {}
    } catch (err) {
      return { error: err instanceof ApiError ? err.message : 'Could not resend credentials.' }
    }
  }, [toast])

  const requestPasswordReset = useCallback(async (email: string) => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return { ok: false as const, error: 'Email address is required.' }
    if (!isValidEmailFormat(trimmed)) return { ok: false as const, error: 'Enter a valid email address.' }

    const started = Date.now()
    const emp = state.employees.find((e) => e.email.toLowerCase() === trimmed && e.status !== 'Inactive')

    let resetPath: string | undefined

    if (emp) {
      try {
        const rawToken = generateResetToken()
        const tokenHash = await hashToken(rawToken)
        const record: PasswordResetToken = {
          id: uid('prt'),
          userId: emp.id,
          tokenHash,
          expiresAt: resetTokenExpiresAt(),
          usedAt: null,
          createdAt: new Date().toISOString(),
        }

        const existing = mergeResetTokens(state.passwordResetTokens)
        const nextTokens = [
          record,
          ...existing.map((t) =>
            t.userId === emp.id && !t.usedAt
              ? { ...t, usedAt: new Date().toISOString() }
              : t,
          ),
        ]
        // Persist immediately so the reset page can validate even before React re-renders
        writeResetTokens(nextTokens)
        setState((s) => ({ ...s, passwordResetTokens: nextTokens }))

        const resetUrl = buildResetUrl(rawToken)
        const sendResult = await sendPasswordResetEmail({
          toEmail: emp.email,
          toName: fullName(emp),
          resetUrl,
        })

        if (sendResult.ok && sendResult.channel === 'local') {
          resetPath = buildResetPath(rawToken)
        }
        if (!sendResult.ok) {
          // Still allow local recovery when mail fails in this SPA environment
          resetPath = buildResetPath(rawToken)
        }
      } catch {
        return { ok: false as const, error: 'Could not create a reset link. Please try again.' }
      }
    }

    const elapsed = Date.now() - started
    if (elapsed < 750) await delay(750 - elapsed)

    return { ok: true as const, ...(resetPath ? { resetPath } : {}) }
  }, [state.employees, state.passwordResetTokens])

  const getResetTokenStatus = useCallback(async (rawToken: string) => {
    if (!rawToken || rawToken.length < 32) return 'invalid' as const
    try {
      const tokenHash = await hashToken(rawToken)
      const tokens = mergeResetTokens(state.passwordResetTokens)
      const record = tokens.find((t) => t.tokenHash === tokenHash)
      if (!record) return 'invalid' as const
      if (record.usedAt) return 'used' as const
      if (new Date(record.expiresAt).getTime() <= Date.now()) return 'expired' as const
      const user = state.employees.find((e) => e.id === record.userId)
      if (!user || user.status === 'Inactive') return 'invalid' as const
      return 'valid' as const
    } catch {
      return 'invalid' as const
    }
  }, [state.employees, state.passwordResetTokens])

  const resetPasswordWithToken = useCallback(async (rawToken: string, nextPassword: string) => {
    if (!nextPassword || nextPassword.length < 8) return 'Password must be at least 8 characters.'
    let failure: string | null = null
    let tokenHash: string
    try {
      tokenHash = await hashToken(rawToken)
    } catch {
      return 'This reset link is no longer valid.'
    }

    setState((s) => {
      const tokens = mergeResetTokens(s.passwordResetTokens)
      const record = tokens.find((t) => t.tokenHash === tokenHash)
      if (!record) {
        failure = 'This reset link is no longer valid.'
        return s
      }
      if (record.usedAt) {
        failure = 'This reset link is no longer valid.'
        return s
      }
      if (new Date(record.expiresAt).getTime() <= Date.now()) {
        failure = 'This reset link is no longer valid.'
        return s
      }
      const user = s.employees.find((e) => e.id === record.userId)
      if (!user || user.status === 'Inactive') {
        failure = 'This reset link is no longer valid.'
        return s
      }

      const nextTokens = tokens.map((t) => {
        if (t.id === record.id || (t.userId === record.userId && !t.usedAt)) {
          return { ...t, usedAt: new Date().toISOString() }
        }
        return t
      })
      writeResetTokens(nextTokens)

      return {
        ...s,
        employees: s.employees.map((e) => (e.id === record.userId ? { ...e, password: nextPassword } : e)),
        passwordResetTokens: nextTokens,
      }
    })

    return failure
  }, [])

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
    const safe = currentUser?.role === 'admin' ? patch : (() => {
      const { role: _role, ...rest } = patch
      return rest
    })()
    setState((s) => ({
      ...s,
      employees: s.employees.map((e) => (e.id === id ? { ...e, ...safe } : e)),
    }))
    toast('Employee updated successfully.')
  }, [currentUser, toast])

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

  const applyLeave = useCallback((payload: {
    employeeId: string
    type: LeaveType
    startDate: string
    endDate: string
    reason: string
    sickNoteName?: string | null
    sickNoteData?: string | null
    sickNoteMime?: string | null
  }) => {
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
      employeeId: payload.employeeId,
      type: payload.type,
      startDate: payload.startDate,
      endDate: payload.endDate,
      reason: payload.reason,
      days,
      status: 'Pending',
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: '',
      createdAt: new Date().toISOString(),
      sickNoteName: payload.sickNoteName ?? null,
      sickNoteData: payload.sickNoteData ?? null,
      sickNoteMime: payload.sickNoteMime ?? null,
    }
    setState((s) => ({ ...s, leaveRequests: [req, ...s.leaveRequests] }))
    const emp = state.employees.find((e) => e.id === payload.employeeId)
    state.employees
      .filter((e) => e.role === 'admin' || e.role === 'manager' || e.id === emp?.managerId)
      .forEach((e) => notify(e.id, 'Leave request awaiting review', `${emp ? fullName(emp) : 'An employee'} requested ${payload.type}.`, 'leave'))
    if (emp) activity(`${fullName(emp)} submitted a ${payload.type.toLowerCase()} request`, 'leave')
    toast('Leave request submitted.')
    return null
  }, [activity, notify, state.employees, state.leaveBalances, state.leaveRequests, toast])

  const reviewLeave = useCallback((id: string, status: Exclude<RequestStatus, 'Pending'>, reviewerId: string, note: string) => {
    const req = state.leaveRequests.find((r) => r.id === id)
    if (!req) return
    const reviewer = state.employees.find((e) => e.id === reviewerId)
    if (!reviewer || (reviewer.role !== 'admin' && reviewer.role !== 'manager' && reviewer.role !== 'super_admin')) {
      toast('You are not authorised to review leave.', 'error')
      return
    }
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
    const label =
      status === 'Requires Review'
        ? 'requires review'
        : status === 'Documentation Required'
          ? 'needs medical documentation'
          : status.toLowerCase()
    notify(
      req.employeeId,
      status === 'Approved'
        ? 'Leave approved'
        : status === 'Rejected'
          ? 'Leave rejected'
          : status === 'Documentation Required'
            ? 'Medical certificate requested'
            : 'Leave needs clarification',
      `${req.type} (${req.startDate} – ${req.endDate}) ${label}.`,
      'leave',
    )
    toast(
      status === 'Approved'
        ? 'Leave request approved.'
        : status === 'Rejected'
          ? 'Leave request rejected.'
          : status === 'Documentation Required'
            ? 'Employee asked to upload medical documentation.'
            : 'Clarification requested.',
    )
  }, [notify, state.employees, state.leaveRequests, toast])

  const attachSickNote = useCallback((leaveId: string, file: { name: string; data: string; mime: string }, actorId: string) => {
    const req = state.leaveRequests.find((r) => r.id === leaveId)
    if (!req) return 'Leave request not found.'
    if (req.type !== 'Sick Leave') return 'Medical certificates only apply to Sick Leave.'
    if (req.employeeId !== actorId) return 'You can only upload a certificate for your own leave request.'
    if (req.status === 'Rejected' || req.status === 'Approved') {
      return 'This leave request can no longer accept a medical certificate.'
    }
    if (!file.data || !file.name) return 'Choose a medical certificate file to upload.'

    setState((s) => ({
      ...s,
      leaveRequests: s.leaveRequests.map((r) =>
        r.id === leaveId
          ? {
              ...r,
              sickNoteName: file.name,
              sickNoteData: file.data,
              sickNoteMime: file.mime,
              status: r.status === 'Documentation Required' ? 'Pending' : r.status,
            }
          : r,
      ),
    }))

    state.employees
      .filter((e) => e.role === 'admin' || e.role === 'manager')
      .forEach((e) =>
        notify(
          e.id,
          'Medical certificate uploaded',
          `${fullName(state.employees.find((x) => x.id === actorId) ?? { firstName: 'An', lastName: 'employee' })} uploaded a certificate for sick leave.`,
          'leave',
        ),
      )
    toast('Medical certificate uploaded.')
    return null
  }, [notify, state.employees, state.leaveRequests, toast])

  const canViewSickNote = useCallback((leaveId: string) => {
    if (!currentUser) return false
    const req = state.leaveRequests.find((r) => r.id === leaveId)
    if (!req?.sickNoteData) return false
    if (currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'super_admin') return true
    return currentUser.id === req.employeeId
  }, [currentUser, state.leaveRequests])

  const getSickNote = useCallback((leaveId: string) => {
    if (!canViewSickNote(leaveId)) return null
    const req = state.leaveRequests.find((r) => r.id === leaveId)
    if (!req?.sickNoteData || !req.sickNoteName) return null
    return { name: req.sickNoteName, data: req.sickNoteData, mime: req.sickNoteMime || 'application/octet-stream' }
  }, [canViewSickNote, state.leaveRequests])

  const createManagedUser = useCallback((payload: {
    firstName: string
    lastName: string
    email: string
    phone: string
    role: Role
    departmentId: string
    position: string
    password: string
  }) => {
    void payload
    return 'Use Admin Management or Employee Management — accounts are created through the secure API with emailed credentials.'
  }, [])

  const setUserRole = useCallback((employeeId: string, role: Role) => {
    void employeeId
    void role
    return 'Role changes are managed through Admin Management and Employee Management on the server.'
  }, [])

  const saveInternship = useCallback((
    payload: Omit<Internship, 'id' | 'createdAt' | 'createdBy'> & { id?: string },
    actorId: string,
  ) => {
    const actor = state.employees.find((e) => e.id === actorId)
    if (!actor || (actor.role !== 'admin' && actor.role !== 'manager' && actor.role !== 'super_admin')) {
      return 'Only HR Managers and Administrators can manage internships.'
    }
    if (!payload.title.trim()) return 'Title is required.'
    if (!payload.deadline) return 'Application deadline is required.'
    if (payload.id) {
      setState((s) => ({
        ...s,
        internships: s.internships.map((i) => (i.id === payload.id ? { ...i, ...payload, id: i.id, createdBy: i.createdBy, createdAt: i.createdAt } : i)),
      }))
      toast('Internship announcement updated.')
      return null
    }
    const item: Internship = {
      id: uid('int'),
      title: payload.title.trim(),
      departmentId: payload.departmentId,
      description: payload.description.trim(),
      requirements: payload.requirements.trim(),
      location: payload.location.trim(),
      duration: payload.duration.trim(),
      deadline: payload.deadline,
      status: payload.status,
      createdBy: actorId,
      createdAt: new Date().toISOString(),
    }
    setState((s) => ({ ...s, internships: [item, ...s.internships] }))
    activity(`Internship posted: ${item.title}`, 'internship')
    toast(payload.status === 'Open' ? 'Internship published.' : 'Internship saved.')
    return null
  }, [activity, state.employees, toast])

  const setInternshipStatus = useCallback((id: string, status: InternshipStatus) => {
    setState((s) => ({
      ...s,
      internships: s.internships.map((i) => (i.id === id ? { ...i, status } : i)),
    }))
    toast(status === 'Open' ? 'Internship opened.' : 'Internship closed.')
  }, [toast])

  const deleteInternship = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      internships: s.internships.filter((i) => i.id !== id),
      internshipApplications: s.internshipApplications.filter((a) => a.internshipId !== id),
    }))
    toast('Internship announcement removed.')
  }, [toast])

  const applyInternship = useCallback((payload: {
    internshipId: string
    applicantId: string
    name: string
    email: string
    phone: string
    message: string
    cvName?: string | null
    cvData?: string | null
    cvMime?: string | null
  }) => {
    const post = state.internships.find((i) => i.id === payload.internshipId)
    if (!post || post.status !== 'Open') return 'This internship is not open for applications.'
    if (post.deadline < todayISO()) return 'The application deadline has passed.'
    if (!payload.name.trim() || !payload.email.trim()) return 'Name and email are required.'
    if (!payload.message.trim()) return 'Please include a short cover message.'
    const duplicate = state.internshipApplications.some(
      (a) => a.internshipId === payload.internshipId && a.applicantId === payload.applicantId && a.status !== 'Rejected',
    )
    if (duplicate) return 'You already have an application for this internship.'
    const app: InternshipApplication = {
      id: uid('ia'),
      internshipId: payload.internshipId,
      applicantId: payload.applicantId,
      name: payload.name.trim(),
      email: payload.email.trim(),
      phone: payload.phone.trim(),
      message: payload.message.trim(),
      cvName: payload.cvName ?? null,
      cvData: payload.cvData ?? null,
      cvMime: payload.cvMime ?? null,
      status: 'Pending',
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
    }
    setState((s) => ({ ...s, internshipApplications: [app, ...s.internshipApplications] }))
    state.employees
      .filter((e) => e.role === 'admin' || e.role === 'manager')
      .forEach((e) =>
        notify(e.id, 'New internship application', `${app.name} applied for ${post.title}.`, 'internship'),
      )
    activity(`${app.name} applied for ${post.title}`, 'internship')
    toast('Internship application submitted.')
    return null
  }, [activity, notify, state.employees, state.internshipApplications, state.internships, toast])

  const reviewInternshipApplication = useCallback((
    id: string,
    status: InternshipApplicationStatus,
    reviewerId: string,
  ) => {
    const reviewer = state.employees.find((e) => e.id === reviewerId)
    if (!reviewer || (reviewer.role !== 'admin' && reviewer.role !== 'manager' && reviewer.role !== 'super_admin')) {
      toast('You are not authorised to review applications.', 'error')
      return
    }
    const app = state.internshipApplications.find((a) => a.id === id)
    if (!app) return
    setState((s) => ({
      ...s,
      internshipApplications: s.internshipApplications.map((a) =>
        a.id === id
          ? { ...a, status, reviewedAt: new Date().toISOString(), reviewedBy: reviewerId }
          : a,
      ),
    }))
    notify(
      app.applicantId,
      'Internship application update',
      `Your application for ${state.internships.find((i) => i.id === app.internshipId)?.title ?? 'an internship'} is now: ${status}.`,
      'internship',
    )
    toast('Application status updated.')
  }, [notify, state.employees, state.internshipApplications, state.internships, toast])

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
    authLoading,
    apiEnabled,
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
    requestPasswordReset,
    getResetTokenStatus,
    resetPasswordWithToken,
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
    attachSickNote,
    canViewSickNote,
    getSickNote,
    setUserRole,
    createManagedUser,
    createAdminAccount,
    createEmployeeAccount,
    resendAdminCredentials,
    resendEmployeeCredentials,
    refreshDirectory,
    saveInternship,
    setInternshipStatus,
    deleteInternship,
    applyInternship,
    reviewInternshipApplication,
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
