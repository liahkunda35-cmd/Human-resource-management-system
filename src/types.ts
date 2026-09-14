export type Role = 'super_admin' | 'admin' | 'manager' | 'employee'
export type EmploymentStatus = 'Active' | 'On Leave' | 'Probation' | 'Inactive'
export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Intern'
export type Gender = 'Female' | 'Male' | 'Non-binary'
export type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'On Leave' | 'Remote'
export type LeaveType =
  | 'Annual Leave'
  | 'Sick Leave'
  | 'Maternity Leave'
  | 'Paternity Leave'
  | 'Emergency Leave'
  | 'Unpaid Leave'
export type RequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Requires Review' | 'Documentation Required'
export type InternshipStatus = 'Open' | 'Closed'
export type InternshipApplicationStatus =
  | 'Pending'
  | 'Under Review'
  | 'Shortlisted'
  | 'Accepted'
  | 'Rejected'

export interface Employee {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  email: string
  password: string
  role: Role
  mustChangePassword?: boolean
  gender: Gender
  dateOfBirth: string
  phone: string
  address: string
  departmentId: string
  position: string
  employmentType: EmploymentType
  dateJoined: string
  managerId: string | null
  status: EmploymentStatus
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

export interface Department {
  id: string
  name: string
  managerId: string | null
  description: string
}

export interface Position {
  id: string
  title: string
  departmentId: string
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  date: string
  clockIn: string | null
  clockOut: string | null
  breakMinutes: number
  hours: number
  status: AttendanceStatus
  note: string
}

export interface LeaveBalance {
  employeeId: string
  annual: number
  sick: number
  maternity: number
  paternity: number
  emergency: number
  unpaid: number
}

export interface LeaveRequest {
  id: string
  employeeId: string
  type: LeaveType
  startDate: string
  endDate: string
  days: number
  reason: string
  status: RequestStatus
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNote: string
  createdAt: string
  sickNoteName: string | null
  sickNoteData: string | null
  sickNoteMime: string | null
}

export interface Internship {
  id: string
  title: string
  departmentId: string
  description: string
  requirements: string
  location: string
  duration: string
  deadline: string
  status: InternshipStatus
  createdBy: string
  createdAt: string
}

export interface InternshipApplication {
  id: string
  internshipId: string
  applicantId: string
  name: string
  email: string
  phone: string
  message: string
  cvName: string | null
  cvData: string | null
  cvMime: string | null
  status: InternshipApplicationStatus
  submittedAt: string
  reviewedAt: string | null
  reviewedBy: string | null
}

export interface AppNotification {
  id: string
  userId: string
  title: string
  body: string
  type: string
  read: boolean
  createdAt: string
}

export interface Activity {
  id: string
  text: string
  time: string
  kind: string
}

export interface OrgSettings {
  companyName: string
  tagline: string
  address: string
  phone: string
  email: string
  website: string
  dateFormat: string
  currency: string
  theme: 'warm' | 'contrast'
  workStart: string
}

export interface PasswordResetToken {
  id: string
  userId: string
  /** SHA-256 hash of the raw token — never store the raw token */
  tokenHash: string
  expiresAt: string
  usedAt: string | null
  createdAt: string
}

export interface AppState {
  employees: Employee[]
  departments: Department[]
  positions: Position[]
  attendance: AttendanceRecord[]
  leaveBalances: LeaveBalance[]
  leaveRequests: LeaveRequest[]
  internships: Internship[]
  internshipApplications: InternshipApplication[]
  passwordResetTokens: PasswordResetToken[]
  notifications: AppNotification[]
  activities: Activity[]
  settings: OrgSettings
  leaveTypeDays: Record<LeaveType, number>
}

export function fullName(e: Pick<Employee, 'firstName' | 'lastName'>): string {
  return `${e.firstName} ${e.lastName}`
}

export function roleLabel(role: Role): string {
  if (role === 'super_admin') return 'Super Administrator'
  if (role === 'admin') return 'Administrator'
  if (role === 'manager') return 'HR Manager'
  return 'Employee'
}
