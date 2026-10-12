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
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  OrgSettings,
  PasswordResetToken,
  RequestStatus,
  Role,
  Workshop,
  WorkshopStatus,
} from '../types'
import { fullName } from '../types'
import {
  delay,
  isValidEmailFormat,
  RESET_TOKENS_KEY,
} from '../lib/passwordReset'
import {
  apiRequest,
  ApiError,
  getToken,
  setToken,
} from '../services/api'
import type { ApiUser } from '../services/api'
import { apiUserToEmployee } from '../services/mappers'
import { leaveEligibilityError } from '../lib/leavePolicy'
import {
  completeLocalSignupRequest,
  readLocalSignupRequests,
  saveLocalSignupRequest,
  type SignupRequest,
} from '../lib/signupRequests'

const STATE_KEY = 'zamtech-hrms-v3'
const LEGACY_STATE_KEY = 'zamtech-hrms-v2'
const SESSION_KEY = 'zamtech-hrms-session'

const DEV_ADMIN_ID = 'dev-admin'

function offlineDevAdmin(actorId: string | null, err: unknown) {
  return actorId === DEV_ADMIN_ID && (!(err instanceof ApiError) || err.status >= 500)
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function mergeDepartments(
  current: Department[],
  incoming: { id: string; name: string; description: string }[],
): Department[] {
  const byId = new Map(current.map((d) => [d.id, d]))
  for (const d of incoming) {
    const prev = byId.get(d.id)
    byId.set(d.id, {
      id: d.id,
      name: d.name,
      description: d.description || '',
      managerId: prev?.managerId ?? null,
    })
  }
  return Array.from(byId.values())
}

function mergeBalances(current: LeaveBalance[], incoming: LeaveBalance[]): LeaveBalance[] {
  const byId = new Map(current.map((b) => [b.employeeId, { ...b, compassionate: b.compassionate ?? 5, study: b.study ?? 5 }]))
  for (const b of incoming) byId.set(b.employeeId, b)
  return Array.from(byId.values())
}

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
  const employees = (raw.employees ?? seed.employees).map((employee) => ({ ...employee, password: '' }))
  return {
    ...seed,
    ...raw,
    employees,
    leaveRequests,
    leaveBalances: (raw.leaveBalances ?? seed.leaveBalances).map((b) => ({
      ...b,
      compassionate: b.compassionate ?? 5,
      study: b.study ?? 5,
    })),
    leaveTypeDays: { ...seed.leaveTypeDays, ...(raw.leaveTypeDays ?? {}) },
    workshops: raw.workshops ?? [],
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
  signup: (name: string, email: string) => Promise<{ ok: true; warning?: string } | { ok: false; error: string }>
  listSignupRequests: () => Promise<{ id: string; firstName: string; lastName: string; name: string; email: string; createdAt: string }[]>
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
  getActivationStatus: (rawToken: string) => Promise<'valid' | 'invalid' | 'expired' | 'used'>
  activateAccount: (rawToken: string, nextPassword: string) => Promise<string | null>
  addEmployee: (data: Omit<Employee, 'id' | 'employeeId' | 'password' | 'avatarHue'> & { password?: string }) => Employee
  saveEmployee: (id: string, patch: Partial<Employee>) => Promise<string | null>
  deactivateEmployee: (id: string) => Promise<string | null>
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
  }) => Promise<string | null>
  reviewLeave: (id: string, status: Exclude<RequestStatus, 'Pending'>, reviewerId: string, note: string) => Promise<void>
  attachSickNote: (leaveId: string, file: { name: string; data: string; mime: string }, actorId: string) => Promise<string | null>
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
    password?: string
  }) => Promise<{ error?: string; warning?: string }>
  createEmployeeAccount: (payload: {
    firstName: string
    lastName: string
    email: string
    phone: string
    position?: string
    departmentId?: string
    employmentType?: string
    gender?: string
    address?: string
    dateOfBirth?: string
    dateJoined?: string
    basicSalary?: number
    housingAllowance?: number
    transportAllowance?: number
    otherAllowance?: number
    taxRate?: number
    bankName?: string
    accountNumber?: string
  }) => Promise<{ error?: string; warning?: string }>
  resendAdminCredentials: (userId: string) => Promise<{ error?: string; warning?: string }>
  resendEmployeeCredentials: (userId: string) => Promise<{ error?: string; warning?: string }>
  refreshDirectory: () => Promise<void>
  saveWorkshop: (payload: Omit<Workshop, 'id' | 'createdAt' | 'createdBy'> & { id?: string }) => Promise<string | null>
  setWorkshopStatus: (id: string, status: WorkshopStatus) => Promise<string | null>
  deleteWorkshop: (id: string) => Promise<string | null>
  markNotificationRead: (id: string) => void
  markAllRead: (userId: string) => void
}

const StoreContext = createContext<StoreValue | null>(null)

function persist(state: AppState) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state))
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState())
  const [userId, setUserId] = useState<string | null>(null)
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
      try {
        const [leave, workshops, departments] = await Promise.all([
          apiRequest<{ applications: LeaveRequest[]; balances: LeaveBalance[] }>('/leave'),
          apiRequest<{ workshops: Workshop[] }>('/workshops'),
          apiRequest<{ departments: { id: string; name: string; description: string }[] }>('/departments'),
        ])
        setState((s) => ({
          ...s,
          departments: mergeDepartments(s.departments, departments.departments),
          leaveRequests: [
            ...leave.applications,
            ...s.leaveRequests.filter((r) => !isUuid(r.id)),
          ],
          leaveBalances: mergeBalances(s.leaveBalances, leave.balances),
          workshops: workshops.workshops,
        }))
      } catch {
        /* operational data sync waits until the password gate is cleared */
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
      try {
        await refreshDirectory()
      } catch {
        /* directory refresh optional after login */
      }
      if (data.user.mustChangePassword) return { mustChangePassword: true as const }
      return null
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return err.message
      if (err instanceof ApiError && err.status >= 500) {
        return 'The HR service is not running. Start it with npm run dev:api, then try again.'
      }
      if (err instanceof ApiError) return err.message
      return 'Sign-in is unavailable. Check that the HR system is running and try again.'
    }
  }, [refreshDirectory, upsertApiUser])

  const signup = useCallback(async (name: string, email: string) => {
    try {
      await apiRequest('/auth/signup', { method: 'POST', json: { name, email } })
      saveLocalSignupRequest(name, email)
      return { ok: true as const }
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        return { ok: false as const, error: err.message }
      }
      saveLocalSignupRequest(name, email)
      return {
        ok: true as const,
        warning: 'Your details were saved for Human Resources. Login details will be emailed after your account is created.',
      }
    }
  }, [])

  const listSignupRequests = useCallback(async () => {
    try {
      const data = await apiRequest<{ requests: SignupRequest[] }>('/auth/signup-requests')
      return data.requests.filter((row) => row.status !== 'completed')
    } catch {
      return readLocalSignupRequests().filter((row) => row.status === 'pending')
    }
  }, [])

  const logout = useCallback(() => {
    setUserId(null)
    setToken(null)
    sessionStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem('zamtech-hrms-remember')
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
    const { role: _role, password: _password, gender: _gender, employeeId: _code, ...safe } = patch
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
    password?: string
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
      toast('Administrator account created. Share the temporary password with them securely.')
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
    employmentType?: string
    gender?: string
    address?: string
    dateOfBirth?: string
    dateJoined?: string
    basicSalary?: number
    housingAllowance?: number
    transportAllowance?: number
    otherAllowance?: number
    taxRate?: number
    bankName?: string
    accountNumber?: string
  }) => {
    try {
      const data = await apiRequest<{ user: ApiUser; emailSent: boolean; warning?: string }>('/employees', {
        method: 'POST',
        json: payload,
      })
      upsertApiUser(data.user)
      try {
        await refreshDirectory()
      } catch {
        /* directory refresh is optional */
      }
      if (data.warning) {
        toast(data.warning, 'info')
        return { warning: data.warning }
      }
      toast('Employee account created. An activation email with their employee number was sent.')
      completeLocalSignupRequest(payload.email)
      return {}
    } catch (err) {
      if (offlineDevAdmin(userId, err)) {
        const year = new Date().getFullYear().toString().slice(2)
        const emp: Employee = {
          id: uid('e'),
          employeeId: `ZTS-${year}${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
          firstName: payload.firstName.trim(),
          lastName: payload.lastName.trim(),
          email: payload.email.trim().toLowerCase(),
          password: '',
          role: 'employee',
          gender: (payload.gender as Employee['gender']) || 'Female',
          dateOfBirth: payload.dateOfBirth || '1990-01-01',
          phone: payload.phone || '',
          address: payload.address || '',
          departmentId: payload.departmentId || '',
          position: payload.position || 'Team Member',
          employmentType: (payload.employmentType as Employee['employmentType']) || 'Full-time',
          dateJoined: payload.dateJoined || todayISO(),
          managerId: null,
          status: 'Active',
          accountStatus: 'invited',
          avatarHue: Math.floor(Math.random() * 360),
          basicSalary: payload.basicSalary ?? 0,
          housingAllowance: payload.housingAllowance ?? 0,
          transportAllowance: payload.transportAllowance ?? 0,
          otherAllowance: payload.otherAllowance ?? 0,
          taxRate: payload.taxRate ?? 0,
          bankName: payload.bankName || '',
          accountNumber: payload.accountNumber || '',
          emergencyContact: '',
          emergencyPhone: '',
        }
        setState((s) => ({
          ...s,
          employees: [emp, ...s.employees],
          leaveBalances: [...s.leaveBalances, {
            employeeId: emp.id,
            annual: s.leaveTypeDays['Annual Leave'],
            sick: s.leaveTypeDays['Sick Leave'],
            maternity: emp.gender === 'Female' ? s.leaveTypeDays['Maternity Leave'] : 0,
            paternity: emp.gender === 'Male' ? s.leaveTypeDays['Paternity Leave'] : 0,
            compassionate: s.leaveTypeDays['Compassionate Leave'],
            study: s.leaveTypeDays['Study Leave'],
            emergency: s.leaveTypeDays['Emergency Leave'],
            unpaid: s.leaveTypeDays['Unpaid Leave'],
          }],
        }))
        toast('Employee saved in this workspace. A database sign-in for them needs PostgreSQL.')
        completeLocalSignupRequest(payload.email)
        return {}
      }
      return { error: err instanceof ApiError ? err.message : 'Could not create employee.' }
    }
  }, [refreshDirectory, toast, upsertApiUser, userId])

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
      toast('A new activation email was sent.')
      return {}
    } catch (err) {
      return { error: err instanceof ApiError ? err.message : 'Could not resend the activation email.' }
    }
  }, [toast])

  const requestPasswordReset = useCallback(async (email: string) => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return { ok: false as const, error: 'Email address is required.' }
    if (!isValidEmailFormat(trimmed)) return { ok: false as const, error: 'Enter a valid email address.' }

    const started = Date.now()
    try {
      await apiRequest<{ ok: boolean }>('/auth/forgot-password', {
        method: 'POST',
        json: { email: trimmed },
      })
    } catch {
      /* still return the generic success shape so accounts cannot be guessed */
    }
    const elapsed = Date.now() - started
    if (elapsed < 750) await delay(750 - elapsed)
    return { ok: true as const }
  }, [])

  const getResetTokenStatus = useCallback(async (rawToken: string) => {
    if (!rawToken || rawToken.length < 32) return 'invalid' as const
    try {
      const data = await apiRequest<{ status: 'valid' | 'invalid' | 'used' | 'expired' }>(
        `/auth/reset-password?token=${encodeURIComponent(rawToken)}`,
      )
      return data.status
    } catch {
      return 'invalid' as const
    }
  }, [])

  const resetPasswordWithToken = useCallback(async (rawToken: string, nextPassword: string) => {
    if (!nextPassword || nextPassword.length < 8) return 'Password must be at least 8 characters.'
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        json: { token: rawToken, newPassword: nextPassword },
      })
      return null
    } catch (err) {
      return err instanceof ApiError ? err.message : 'This reset link is no longer valid.'
    }
  }, [])

  const getActivationStatus = useCallback(async (rawToken: string) => {
    if (!rawToken || rawToken.length < 32) return 'invalid' as const
    try {
      const data = await apiRequest<{ status: 'valid' | 'invalid' | 'expired' | 'used' }>(
        `/auth/activate?token=${encodeURIComponent(rawToken)}`,
      )
      return data.status
    } catch {
      return 'invalid' as const
    }
  }, [])

  const activateAccount = useCallback(async (rawToken: string, nextPassword: string) => {
    if (!nextPassword || nextPassword.length < 8) return 'Password must be at least 8 characters.'
    try {
      await apiRequest('/auth/activate', {
        method: 'POST',
        json: { token: rawToken, newPassword: nextPassword },
      })
      return null
    } catch (err) {
      return err instanceof ApiError ? err.message : 'This activation link is no longer valid.'
    }
  }, [])

  const addEmployee = useCallback((data: Omit<Employee, 'id' | 'employeeId' | 'password' | 'avatarHue'> & { password?: string }) => {
    const year = new Date().getFullYear().toString().slice(2)
    const emp: Employee = {
      ...data,
      id: uid('e'),
      employeeId: `ZTS-${year}${Math.floor(100 + Math.random() * 899)}`,
      password: '',
      avatarHue: Math.floor(Math.random() * 360),
    }
    setState((s) => ({ ...s, employees: [emp, ...s.employees], leaveBalances: [...s.leaveBalances, {
      employeeId: emp.id,
      annual: s.leaveTypeDays['Annual Leave'],
      sick: s.leaveTypeDays['Sick Leave'],
      maternity: emp.gender === 'Female' ? s.leaveTypeDays['Maternity Leave'] : 0,
      paternity: emp.gender === 'Male' ? s.leaveTypeDays['Paternity Leave'] : 0,
      compassionate: s.leaveTypeDays['Compassionate Leave'],
      study: s.leaveTypeDays['Study Leave'],
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

  const saveEmployee = useCallback(async (id: string, patch: Partial<Employee>) => {
    const { role: _role, password: _password, ...safe } = patch
    if (isUuid(id)) {
      try {
        const data = await apiRequest<{ user: ApiUser }>(`/employees/${id}`, {
          method: 'PATCH',
          json: {
            firstName: safe.firstName,
            lastName: safe.lastName,
            email: safe.email,
            phone: safe.phone,
            address: safe.address,
            departmentId: safe.departmentId,
            position: safe.position,
            employmentType: safe.employmentType,
            status: safe.status,
            dateJoined: safe.dateJoined,
            gender: safe.gender,
            dateOfBirth: safe.dateOfBirth,
            employeeCode: safe.employeeId,
            basicSalary: safe.basicSalary,
            housingAllowance: safe.housingAllowance,
            transportAllowance: safe.transportAllowance,
            otherAllowance: safe.otherAllowance,
            taxRate: safe.taxRate,
            bankName: safe.bankName,
            accountNumber: safe.accountNumber,
          },
        })
        upsertApiUser(data.user)
        toast('Employee updated successfully.')
        return null
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Could not update the employee.'
        toast(message, 'error')
        return message
      }
    }
    setState((s) => ({
      ...s,
      employees: s.employees.map((e) => (e.id === id ? { ...e, ...safe, password: '' } : e)),
    }))
    toast('Employee updated successfully.')
    return null
  }, [toast, upsertApiUser])

  const deactivateEmployee = useCallback(async (id: string) => {
    if (isUuid(id)) {
      try {
        const data = await apiRequest<{ user: ApiUser }>(`/employees/${id}/deactivate`, {
          method: 'POST',
        })
        upsertApiUser(data.user)
        toast('Employee deactivated. They can no longer sign in.')
        return null
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Could not deactivate the employee.'
        toast(message, 'error')
        return message
      }
    }
    setState((s) => ({
      ...s,
      employees: s.employees.map((e) => (e.id === id ? { ...e, status: 'Inactive' as const, password: '' } : e)),
    }))
    toast('Employee deactivated.')
    return null
  }, [toast, upsertApiUser])

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

  const applyLeave = useCallback(async (payload: {
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
    const applicant = state.employees.find((e) => e.id === payload.employeeId)
    const blocked = leaveEligibilityError(applicant?.gender, payload.type)
    if (blocked) return blocked
    try {
      const data = await apiRequest<{ application: LeaveRequest }>('/leave/applications', {
        method: 'POST',
        json: payload,
      })
      setState((s) => ({ ...s, leaveRequests: [data.application, ...s.leaveRequests.filter((r) => r.id !== data.application.id)] }))
      const emp = applicant
      state.employees
        .filter((e) => e.role === 'admin' || e.role === 'manager' || e.role === 'super_admin' || e.id === emp?.managerId)
        .forEach((e) => notify(e.id, 'Leave request awaiting review', `${emp ? fullName(emp) : 'An employee'} requested ${payload.type}.`, 'leave'))
      if (emp) activity(`${fullName(emp)} submitted a ${payload.type.toLowerCase()} request`, 'leave')
      toast('Leave request submitted.')
      try {
        await refreshDirectory()
      } catch {
        /* balance refresh is optional */
      }
      return null
    } catch (err) {
      if (offlineDevAdmin(userId, err)) {
        const days = leaveDays(payload.startDate, payload.endDate)
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
        toast('Leave request saved in this workspace.')
        return null
      }
      if (err instanceof ApiError) return err.message
      return 'Leave could not be submitted. Please try again.'
    }
  }, [activity, notify, refreshDirectory, state.employees, toast, userId])

  const reviewLeave = useCallback(async (id: string, status: Exclude<RequestStatus, 'Pending'>, reviewerId: string, note: string) => {
    if (isUuid(id)) {
      try {
        const data = await apiRequest<{ application: LeaveRequest; balances: LeaveBalance[] }>(`/leave/applications/${id}/review`, {
          method: 'POST',
          json: { status, note },
        })
        setState((s) => ({
          ...s,
          leaveRequests: s.leaveRequests.map((r) => (r.id === id ? data.application : r)),
          leaveBalances: mergeBalances(s.leaveBalances, data.balances || []),
        }))
        const label = status === 'Approved' ? 'approved' : status === 'Rejected' ? 'rejected' : 'updated'
        notify(data.application.employeeId, `Leave ${label}`, `${data.application.type} was ${label}.`, 'leave')
        toast(`Leave request ${label}.`)
      } catch (err) {
        toast(err instanceof ApiError ? err.message : 'Could not review this leave request.', 'error')
      }
      return
    }
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

  const attachSickNote = useCallback(async (leaveId: string, file: { name: string; data: string; mime: string }, actorId: string) => {
    if (isUuid(leaveId)) {
      try {
        const data = await apiRequest<{ application: LeaveRequest }>(`/leave/applications/${leaveId}/sick-note`, {
          method: 'POST',
          json: file,
        })
        setState((s) => ({
          ...s,
          leaveRequests: s.leaveRequests.map((r) => (r.id === leaveId ? data.application : r)),
        }))
        toast('Medical certificate uploaded.')
        return null
      } catch (err) {
        return err instanceof ApiError ? err.message : 'Could not upload the medical certificate.'
      }
    }
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

  const saveWorkshop = useCallback(async (payload: Omit<Workshop, 'id' | 'createdAt' | 'createdBy'> & { id?: string }) => {
    try {
      const data = await apiRequest<{ workshop: Workshop }>(payload.id ? `/workshops/${payload.id}` : '/workshops', {
        method: payload.id ? 'PATCH' : 'POST',
        json: payload,
      })
      setState((s) => ({
        ...s,
        workshops: [data.workshop, ...s.workshops.filter((w) => w.id !== data.workshop.id)],
      }))
      activity(`Workshop saved: ${data.workshop.title}`, 'workshop')
      toast(payload.id ? 'Workshop updated.' : 'Workshop scheduled.')
      return null
    } catch (err) {
      if (!offlineDevAdmin(userId, err)) {
        return err instanceof ApiError ? err.message : 'Could not save the workshop.'
      }
      const item: Workshop = {
        ...payload,
        id: payload.id || uid('ws'),
        createdBy: userId,
        createdAt: new Date().toISOString(),
        participantIds: payload.participantIds || [],
        departmentId: payload.departmentId || null,
      }
      setState((s) => ({
        ...s,
        workshops: [item, ...s.workshops.filter((w) => w.id !== item.id)],
      }))
      activity(`Workshop saved: ${item.title}`, 'workshop')
      toast(payload.id ? 'Workshop updated.' : 'Workshop scheduled.')
      return null
    }
  }, [activity, toast, userId])

  const setWorkshopStatus = useCallback(async (id: string, status: WorkshopStatus) => {
    try {
      const data = await apiRequest<{ workshop: Workshop }>(`/workshops/${id}/status`, {
        method: 'POST',
        json: { status },
      })
      setState((s) => ({
        ...s,
        workshops: s.workshops.map((w) => (w.id === id ? data.workshop : w)),
      }))
      toast(status === 'Cancelled' ? 'Workshop cancelled.' : 'Workshop status updated.')
      return null
    } catch (err) {
      if (!offlineDevAdmin(userId, err)) {
        const message = err instanceof ApiError ? err.message : 'Could not update the workshop.'
        toast(message, 'error')
        return message
      }
      setState((s) => ({
        ...s,
        workshops: s.workshops.map((w) => (w.id === id ? { ...w, status } : w)),
      }))
      toast(status === 'Cancelled' ? 'Workshop cancelled.' : 'Workshop status updated.')
      return null
    }
  }, [toast, userId])

  const deleteWorkshop = useCallback(async (id: string) => {
    try {
      await apiRequest(`/workshops/${id}`, { method: 'DELETE' })
      setState((s) => ({ ...s, workshops: s.workshops.filter((w) => w.id !== id) }))
      toast('Workshop removed.')
      return null
    } catch (err) {
      if (!offlineDevAdmin(userId, err)) {
        const message = err instanceof ApiError ? err.message : 'Could not delete the workshop.'
        toast(message, 'error')
        return message
      }
      setState((s) => ({ ...s, workshops: s.workshops.filter((w) => w.id !== id) }))
      toast('Workshop removed.')
      return null
    }
  }, [toast, userId])

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
    signup,
    listSignupRequests,
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
    getActivationStatus,
    activateAccount,
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
    saveWorkshop,
    setWorkshopStatus,
    deleteWorkshop,
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
