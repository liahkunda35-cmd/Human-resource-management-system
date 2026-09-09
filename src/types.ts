export type Role = 'admin' | 'manager' | 'employee'
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
export type RequestStatus = 'Pending' | 'Approved' | 'Rejected'
export type PaymentStatus = 'Draft' | 'Processed' | 'Paid'
export type VacancyStatus = 'Open' | 'Closed' | 'On Hold'
export type PipelineStage =
  | 'Applied'
  | 'Screening'
  | 'Shortlisted'
  | 'Interview'
  | 'Selected'
  | 'Hired'
  | 'Rejected'
export type TrainingStatus = 'Upcoming' | 'In Progress' | 'Completed'
export type DocumentCategory =
  | 'Contracts'
  | 'Offer letters'
  | 'Certificates'
  | 'Policies'
  | 'Performance'
  | 'Other'
export type TaskStatus = 'To Do' | 'In Progress' | 'Done'
export type TaskPriority = 'Low' | 'Medium' | 'High'
export type AnnouncementCategory =
  | 'Meetings'
  | 'Holidays'
  | 'Policy'
  | 'Notice'
  | 'Events'

export interface Employee {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  email: string
  password: string
  role: Role
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
}

export interface PayrollRecord {
  id: string
  employeeId: string
  period: string
  basicSalary: number
  housing: number
  transport: number
  other: number
  deductions: number
  tax: number
  net: number
  status: PaymentStatus
  processedAt: string | null
}

export interface Vacancy {
  id: string
  title: string
  departmentId: string
  location: string
  employmentType: EmploymentType
  description: string
  closingDate: string
  status: VacancyStatus
  createdAt: string
}

export interface Application {
  id: string
  vacancyId: string
  candidateName: string
  email: string
  phone: string
  stage: PipelineStage
  appliedAt: string
  notes: string
}

export interface Interview {
  id: string
  applicationId: string
  scheduledAt: string
  interviewer: string
  location: string
  notes: string
}

export interface PerformanceReview {
  id: string
  employeeId: string
  reviewerId: string
  period: string
  overall: number
  goalsAchieved: number
  strengths: string
  improvements: string
  managerComments: string
  employeeComments: string
  createdAt: string
}

export interface Goal {
  id: string
  employeeId: string
  title: string
  kpi: string
  progress: number
  dueDate: string
}

export interface TrainingProgram {
  id: string
  title: string
  description: string
  trainer: string
  date: string
  duration: string
  location: string
  status: TrainingStatus
}

export interface TrainingAssignment {
  id: string
  trainingId: string
  employeeId: string
  progress: number
  completed: boolean
  certificate: boolean
}

export interface HRDocument {
  id: string
  name: string
  category: DocumentCategory
  ownerId: string | null
  visibility: 'all' | 'employee' | 'hr'
  uploadedAt: string
  size: string
  content: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  authorId: string
  category: AnnouncementCategory
  date: string
  pinned: boolean
}

export interface WorkTask {
  id: string
  title: string
  description: string
  assigneeId: string
  assignerId: string
  dueDate: string
  status: TaskStatus
  priority: TaskPriority
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

export interface AppState {
  employees: Employee[]
  departments: Department[]
  positions: Position[]
  attendance: AttendanceRecord[]
  leaveBalances: LeaveBalance[]
  leaveRequests: LeaveRequest[]
  payrolls: PayrollRecord[]
  vacancies: Vacancy[]
  applications: Application[]
  interviews: Interview[]
  reviews: PerformanceReview[]
  goals: Goal[]
  trainings: TrainingProgram[]
  trainingAssignments: TrainingAssignment[]
  documents: HRDocument[]
  announcements: Announcement[]
  tasks: WorkTask[]
  notifications: AppNotification[]
  activities: Activity[]
  settings: OrgSettings
  leaveTypeDays: Record<LeaveType, number>
}

export function fullName(e: Pick<Employee, 'firstName' | 'lastName'>): string {
  return `${e.firstName} ${e.lastName}`
}
