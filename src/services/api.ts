const TOKEN_KEY = 'aurelia-api-token'

export function getApiBase() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') || '/api'
}

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null, remember = true) {
  if (!token) {
    sessionStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_KEY)
    return
  }
  sessionStorage.setItem(TOKEN_KEY, token)
  if (remember) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  code?: string
  warning?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const headers = new Headers(options.headers || {})
  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  })

  let data: Record<string, unknown> | null = null
  try {
    data = (await res.json()) as Record<string, unknown>
  } catch {
    data = null
  }

  if (!res.ok) {
    const message = (data?.error as string) || `Request failed (${res.status})`
    throw new ApiError(message, res.status, data?.code as string | undefined)
  }
  return data as T
}

export type ApiUser = {
  id: string
  employeeId: string
  employeeCode: string
  email: string
  role: 'super_admin' | 'admin' | 'manager' | 'employee'
  roleLabel: string
  accountStatus: string
  mustChangePassword: boolean
  firstName: string
  lastName: string
  phone: string
  address: string
  departmentId: string | null
  position: string
  employmentType: string
  status: string
  dateJoined: string
  managerId: string | null
  gender: string
  dateOfBirth: string | null
  avatarHue: number
  basicSalary: number
  housingAllowance: number
  transportAllowance: number
  otherAllowance: number
  taxRate: number
  bankName: string
  accountNumber: string
  emergencyContact: string
  emergencyPhone: string
}
