import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { env } from '../config/env.js'
import { hashPassword, verifyPassword } from './passwordService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STATE_PATH = path.resolve(__dirname, '../../.dev-admin.json')

export const DEV_ADMIN_ID = 'dev-admin'
export const DEV_EMPLOYEE_ID = 'dev-employee'
export const DEV_MALE_EMPLOYEE_ID = 'dev-employee-male'

function isProduction() {
  return env.nodeEnv === 'production'
}

function accountReady(account) {
  if (isProduction() || !account.enabled) return false
  const username = account.username.trim()
  const email = account.email.trim()
  const password = account.password
  return Boolean(username && email.includes('@') && password.length >= 8)
}

export function isDevAdminActive() {
  return accountReady(env.devAdmin)
}

export function isDevEmployeeActive() {
  return accountReady(env.devEmployee)
}

export function isDevMaleEmployeeActive() {
  return accountReady(env.devMaleEmployee)
}

function readState() {
  try {
    const raw = fs.readFileSync(STATE_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    return {
      passwordHash: typeof parsed.passwordHash === 'string' ? parsed.passwordHash : null,
      mustChangePassword: parsed.mustChangePassword !== false,
    }
  } catch {
    return { passwordHash: null, mustChangePassword: true }
  }
}

function writeState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state), { mode: 0o600 })
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left))
  const b = Buffer.from(String(right))
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

function identifierMatches(identifier, account) {
  const value = String(identifier || '').trim().toLowerCase()
  return value === account.username.trim().toLowerCase()
    || value === account.email.trim().toLowerCase()
}

export function devAdminProfile() {
  const state = readState()
  const today = new Date().toISOString().slice(0, 10)
  return {
    id: DEV_ADMIN_ID,
    employeeId: DEV_ADMIN_ID,
    employeeCode: 'HR-ADMIN',
    email: env.devAdmin.email.trim().toLowerCase(),
    role: 'admin',
    roleLabel: 'Admin / HR',
    accountStatus: 'active',
    mustChangePassword: state.passwordHash ? state.mustChangePassword : false,
    firstName: 'HR',
    lastName: 'Administrator',
    phone: '',
    address: '',
    departmentId: null,
    position: 'Admin / HR',
    employmentType: 'Full-time',
    status: 'Active',
    dateJoined: today,
    managerId: null,
    gender: 'Female',
    dateOfBirth: null,
    avatarHue: 28,
    basicSalary: 0,
    housingAllowance: 0,
    transportAllowance: 0,
    otherAllowance: 0,
    taxRate: 0,
    bankName: '',
    accountNumber: '',
    emergencyContact: '',
    emergencyPhone: '',
  }
}

export async function authenticateDevAdmin(identifier, password) {
  if (!isDevAdminActive() || !identifierMatches(identifier, env.devAdmin)) {
    return { user: null, matched: false }
  }
  const state = readState()
  const passwordOk = state.passwordHash
    ? await verifyPassword(password, state.passwordHash)
    : safeEqual(password, env.devAdmin.password)
  if (!passwordOk) return { user: null, matched: true, error: 'Those details do not match our records.' }
  return { user: devAdminProfile(), matched: true }
}

export async function changeDevAdminPassword(currentPassword, nextPassword) {
  if (!isDevAdminActive()) return { error: 'Development admin sign-in is not enabled.' }
  if (!nextPassword || nextPassword.length < 8) {
    return { error: 'New password must be at least 8 characters.' }
  }
  const state = readState()
  const currentOk = state.passwordHash
    ? await verifyPassword(currentPassword, state.passwordHash)
    : safeEqual(currentPassword, env.devAdmin.password)
  if (!currentOk) return { error: 'Current password is incorrect.' }
  writeState({
    passwordHash: await hashPassword(nextPassword),
    mustChangePassword: false,
  })
  return { user: devAdminProfile() }
}

export function devEmployeeProfile() {
  const today = new Date().toISOString().slice(0, 10)
  return {
    id: DEV_EMPLOYEE_ID,
    employeeId: DEV_EMPLOYEE_ID,
    employeeCode: 'ZTS-1042',
    email: env.devEmployee.email.trim().toLowerCase(),
    role: 'employee',
    roleLabel: 'Employee',
    accountStatus: 'active',
    mustChangePassword: false,
    firstName: 'Chanda',
    lastName: 'Mwila',
    phone: '',
    address: '',
    departmentId: null,
    position: 'Senior Software Engineer',
    employmentType: 'Full-time',
    status: 'Active',
    dateJoined: today,
    managerId: null,
    gender: 'Female',
    dateOfBirth: null,
    avatarHue: 152,
    basicSalary: 0,
    housingAllowance: 0,
    transportAllowance: 0,
    otherAllowance: 0,
    taxRate: 0,
    bankName: '',
    accountNumber: '',
    emergencyContact: '',
    emergencyPhone: '',
  }
}

export async function authenticateDevEmployee(identifier, password) {
  if (isDevEmployeeActive() && identifierMatches(identifier, env.devEmployee)) {
    if (!safeEqual(password, env.devEmployee.password)) {
      return { user: null, matched: true, error: 'Those details do not match our records.' }
    }
    return { user: devEmployeeProfile(), matched: true }
  }
  if (isDevMaleEmployeeActive() && identifierMatches(identifier, env.devMaleEmployee)) {
    if (!safeEqual(password, env.devMaleEmployee.password)) {
      return { user: null, matched: true, error: 'Those details do not match our records.' }
    }
    return { user: devMaleEmployeeProfile(), matched: true }
  }
  return { user: null, matched: false }
}

export function devMaleEmployeeProfile() {
  const today = new Date().toISOString().slice(0, 10)
  return {
    id: DEV_MALE_EMPLOYEE_ID,
    employeeId: DEV_MALE_EMPLOYEE_ID,
    employeeCode: 'ZTS-1020',
    email: env.devMaleEmployee.email.trim().toLowerCase(),
    role: 'employee',
    roleLabel: 'Employee',
    accountStatus: 'active',
    mustChangePassword: false,
    firstName: 'Kelvin',
    lastName: 'Phiri',
    phone: '',
    address: '',
    departmentId: null,
    position: 'Software Engineer',
    employmentType: 'Full-time',
    status: 'Active',
    dateJoined: today,
    managerId: null,
    gender: 'Male',
    dateOfBirth: null,
    avatarHue: 210,
    basicSalary: 0,
    housingAllowance: 0,
    transportAllowance: 0,
    otherAllowance: 0,
    taxRate: 0,
    bankName: '',
    accountNumber: '',
    emergencyContact: '',
    emergencyPhone: '',
  }
}
