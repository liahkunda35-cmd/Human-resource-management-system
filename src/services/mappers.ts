import type { ApiUser } from './api'
import type { Employee, Role } from '../types'

/** Map API user → local Employee shape used by existing pages. */
export function apiUserToEmployee(u: ApiUser): Employee {
  return {
    id: u.id,
    employeeId: u.employeeCode,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    password: '',
    role: u.role as Role,
    mustChangePassword: u.mustChangePassword,
    gender: (u.gender as Employee['gender']) || 'Female',
    dateOfBirth: u.dateOfBirth || '1990-01-01',
    phone: u.phone || '',
    address: u.address || '',
    departmentId: u.departmentId || '',
    position: u.position || '',
    employmentType: (u.employmentType as Employee['employmentType']) || 'Full-time',
    dateJoined: typeof u.dateJoined === 'string' ? u.dateJoined.slice(0, 10) : new Date().toISOString().slice(0, 10),
    managerId: u.managerId,
    status: (u.status as Employee['status']) || 'Active',
    avatarHue: u.avatarHue ?? 30,
    basicSalary: u.basicSalary ?? 0,
    housingAllowance: u.housingAllowance ?? 0,
    transportAllowance: u.transportAllowance ?? 0,
    otherAllowance: u.otherAllowance ?? 0,
    taxRate: u.taxRate ?? 0,
    bankName: u.bankName || '',
    accountNumber: u.accountNumber || '',
    emergencyContact: u.emergencyContact || '',
    emergencyPhone: u.emergencyPhone || '',
  }
}
