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
  LeaveBalance,
  LeaveRequest,
  OrgSettings,
  PayrollRecord,
  PerformanceReview,
  Position,
  TrainingAssignment,
  TrainingProgram,
  Vacancy,
  WorkTask,
} from '../types'
import { fullName } from '../types'

export const DEMO_PASSWORD = 'Aurelia@2026'

const settings: OrgSettings = {
  companyName: 'ZamTech Solutions Ltd',
  tagline: 'People operations, refined.',
  address: 'Plot 2374, Addis Ababa Drive, Rhodes Park, Lusaka',
  phone: '+260 211 255 140',
  email: 'people@zamtech.co.zm',
  website: 'www.zamtech.co.zm',
  dateFormat: 'dd MMM yyyy',
  currency: 'ZMW',
  theme: 'warm',
  workStart: '09:00',
}

function person(
  data: Omit<Employee, 'password'> & { password?: string },
): Employee {
  return { password: DEMO_PASSWORD, ...data }
}

const employees: Employee[] = [
  person({
    id: 'e1', employeeId: 'ZTS-1001', firstName: 'Natasha', lastName: 'Banda',
    email: 'hr@zamtech.co.zm', role: 'admin', gender: 'Female', dateOfBirth: '1986-04-12',
    phone: '+260 97 441 2201', address: '12 Kabulonga Road, Lusaka', departmentId: 'd1',
    position: 'HR Manager', employmentType: 'Full-time', dateJoined: '2018-03-01', managerId: null,
    status: 'Active', avatarHue: 28, basicSalary: 18500, housingAllowance: 2000, transportAllowance: 1200,
    otherAllowance: 500, taxRate: 0.25, bankName: 'Zanaco', accountNumber: '**** 4412',
    emergencyContact: 'Patrick Banda', emergencyPhone: '+260 97 441 2290',
  }),
  person({
    id: 'e2', employeeId: 'ZTS-1008', firstName: 'Lackson', lastName: 'Phiri',
    email: 'manager@zamtech.co.zm', role: 'manager', gender: 'Male', dateOfBirth: '1988-11-03',
    phone: '+260 96 902 1184', address: '44 Roma Park, Lusaka', departmentId: 'd2',
    position: 'IT Manager', employmentType: 'Full-time', dateJoined: '2019-06-17', managerId: 'e1',
    status: 'Active', avatarHue: 210, basicSalary: 22000, housingAllowance: 2500, transportAllowance: 1500,
    otherAllowance: 800, taxRate: 0.28, bankName: 'Stanbic Zambia', accountNumber: '**** 8821',
    emergencyContact: 'Grace Phiri', emergencyPhone: '+260 96 902 1100',
  }),
  person({
    id: 'e3', employeeId: 'ZTS-1042', firstName: 'Chanda', lastName: 'Mwila',
    email: 'employee@zamtech.co.zm', role: 'employee', gender: 'Female', dateOfBirth: '1994-07-22',
    phone: '+260 97 334 9082', address: '9 Woodlands Extension, Lusaka', departmentId: 'd2',
    position: 'Senior Software Engineer', employmentType: 'Full-time', dateJoined: '2021-02-08', managerId: 'e2',
    status: 'Active', avatarHue: 152, basicSalary: 12500, housingAllowance: 1500, transportAllowance: 1000,
    otherAllowance: 400, taxRate: 0.22, bankName: 'FNB Zambia', accountNumber: '**** 3309',
    emergencyContact: 'Mwansa Mwila', emergencyPhone: '+260 97 334 9001',
  }),
  person({
    id: 'e4', employeeId: 'ZTS-1015', firstName: 'Mulenga', lastName: 'Tembo',
    email: 'mulenga.tembo@zamtech.co.zm', role: 'manager', gender: 'Male', dateOfBirth: '1990-01-19',
    phone: '+260 95 118 4406', address: '3 Olympia Park, Lusaka', departmentId: 'd3',
    position: 'Marketing Manager', employmentType: 'Full-time', dateJoined: '2020-01-13', managerId: 'e1',
    status: 'Active', avatarHue: 18, basicSalary: 16000, housingAllowance: 1800, transportAllowance: 1200,
    otherAllowance: 500, taxRate: 0.24, bankName: 'Zanaco', accountNumber: '**** 1190',
    emergencyContact: 'Chilufya Tembo', emergencyPhone: '+260 95 118 4411',
  }),
  person({
    id: 'e5', employeeId: 'ZTS-1020', firstName: 'Esther', lastName: 'Chanda',
    email: 'esther.chanda@zamtech.co.zm', role: 'manager', gender: 'Female', dateOfBirth: '1987-09-04',
    phone: '+260 97 667 3014', address: '21 Meanwood Ndeke, Lusaka', departmentId: 'd4',
    position: 'Finance Manager', employmentType: 'Full-time', dateJoined: '2018-09-10', managerId: 'e1',
    status: 'Active', avatarHue: 340, basicSalary: 18000, housingAllowance: 2000, transportAllowance: 1200,
    otherAllowance: 600, taxRate: 0.26, bankName: 'Absa Zambia', accountNumber: '**** 7742',
    emergencyContact: 'Joseph Chanda', emergencyPhone: '+260 97 667 3099',
  }),
  person({
    id: 'e6', employeeId: 'ZTS-1031', firstName: 'Brian', lastName: 'Zulu',
    email: 'brian.zulu@zamtech.co.zm', role: 'employee', gender: 'Male', dateOfBirth: '1992-05-28',
    phone: '+260 96 220 8811', address: '88 Kabwata Site and Service, Lusaka', departmentId: 'd3',
    position: 'Marketing Officer', employmentType: 'Full-time', dateJoined: '2022-04-04', managerId: 'e4',
    status: 'Active', avatarHue: 40, basicSalary: 7000, housingAllowance: 1000, transportAllowance: 800,
    otherAllowance: 300, taxRate: 0.18, bankName: 'Indo-Zambia Bank', accountNumber: '**** 2208',
    emergencyContact: 'Lena Zulu', emergencyPhone: '+260 96 220 8800',
  }),
  person({
    id: 'e7', employeeId: 'ZTS-1004', firstName: 'Mwaka', lastName: 'Chileshe',
    email: 'mwaka.chileshe@zamtech.co.zm', role: 'admin', gender: 'Female', dateOfBirth: '1991-12-11',
    phone: '+260 97 441 7720', address: '15 Northmead, Lusaka', departmentId: 'd1',
    position: 'HR Officer', employmentType: 'Full-time', dateJoined: '2019-11-04', managerId: 'e1',
    status: 'Active', avatarHue: 12, basicSalary: 11000, housingAllowance: 1200, transportAllowance: 1000,
    otherAllowance: 300, taxRate: 0.21, bankName: 'Stanbic Zambia', accountNumber: '**** 4417',
    emergencyContact: 'Agatha Chileshe', emergencyPhone: '+260 97 441 7701',
  }),
  person({
    id: 'e8', employeeId: 'ZTS-1048', firstName: 'Kelvin', lastName: 'Phiri',
    email: 'kelvin.phiri@zamtech.co.zm', role: 'employee', gender: 'Male', dateOfBirth: '1995-03-16',
    phone: '+260 96 990 2263', address: '6 Libala Stage 3, Lusaka', departmentId: 'd2',
    position: 'Software Developer', employmentType: 'Full-time', dateJoined: '2023-01-16', managerId: 'e2',
    status: 'Active', avatarHue: 200, basicSalary: 9500, housingAllowance: 1000, transportAllowance: 1000,
    otherAllowance: 200, taxRate: 0.2, bankName: 'Zanaco', accountNumber: '**** 9902',
    emergencyContact: 'Mary Phiri', emergencyPhone: '+260 96 990 2200',
  }),
  person({
    id: 'e9', employeeId: 'ZTS-1012', firstName: 'Gift', lastName: 'Mwanza',
    email: 'gift.mwanza@zamtech.co.zm', role: 'manager', gender: 'Male', dateOfBirth: '1989-08-07',
    phone: '+260 97 118 5530', address: '2 Avondale, Lusaka', departmentId: 'd5',
    position: 'Customer Service Manager', employmentType: 'Full-time', dateJoined: '2020-05-18', managerId: 'e1',
    status: 'Active', avatarHue: 355, basicSalary: 12000, housingAllowance: 1500, transportAllowance: 1000,
    otherAllowance: 400, taxRate: 0.22, bankName: 'FNB Zambia', accountNumber: '**** 1185',
    emergencyContact: 'Bupe Mwanza', emergencyPhone: '+260 97 118 5500',
  }),
  person({
    id: 'e10', employeeId: 'ZTS-1055', firstName: 'Memory', lastName: 'Mulenga',
    email: 'memory.mulenga@zamtech.co.zm', role: 'employee', gender: 'Female', dateOfBirth: '1996-10-02',
    phone: '+260 95 441 0091', address: '19 Chelston, Lusaka', departmentId: 'd7',
    position: 'Administration Officer', employmentType: 'Full-time', dateJoined: '2023-08-01', managerId: 'e1',
    status: 'Probation', avatarHue: 190, basicSalary: 5500, housingAllowance: 800, transportAllowance: 800,
    otherAllowance: 0, taxRate: 0.16, bankName: 'Zanaco', accountNumber: '**** 4410',
    emergencyContact: 'Peter Mulenga', emergencyPhone: '+260 95 441 0002',
  }),
  person({
    id: 'e11', employeeId: 'ZTS-1006', firstName: 'Rachael', lastName: 'Zulu',
    email: 'rachael.zulu@zamtech.co.zm', role: 'admin', gender: 'Female', dateOfBirth: '1993-02-25',
    phone: '+260 96 772 3318', address: '11 Longacres, Lusaka', departmentId: 'd1',
    position: 'Recruitment Specialist', employmentType: 'Full-time', dateJoined: '2021-07-12', managerId: 'e1',
    status: 'Active', avatarHue: 32, basicSalary: 9000, housingAllowance: 1000, transportAllowance: 1000,
    otherAllowance: 200, taxRate: 0.2, bankName: 'Stanbic Zambia', accountNumber: '**** 7723',
    emergencyContact: 'Claire Zulu', emergencyPhone: '+260 96 772 3300',
  }),
  person({
    id: 'e12', employeeId: 'ZTS-1051', firstName: 'Blessings', lastName: 'Mumba',
    email: 'blessings.mumba@zamtech.co.zm', role: 'employee', gender: 'Male', dateOfBirth: '1997-06-14',
    phone: '+260 97 220 6644', address: '27 Chilenje South, Lusaka', departmentId: 'd2',
    position: 'Software Developer', employmentType: 'Full-time', dateJoined: '2024-03-11', managerId: 'e2',
    status: 'Active', avatarHue: 165, basicSalary: 8000, housingAllowance: 1000, transportAllowance: 800,
    otherAllowance: 200, taxRate: 0.19, bankName: 'FNB Zambia', accountNumber: '**** 2206',
    emergencyContact: 'Sam Mumba', emergencyPhone: '+260 97 220 6600',
  }),
  person({
    id: 'e13', employeeId: 'ZTS-1038', firstName: 'Thandiwe', lastName: 'Ngoma',
    email: 'thandiwe.ngoma@zamtech.co.zm', role: 'employee', gender: 'Female', dateOfBirth: '1994-11-30',
    phone: '+260 96 990 1147', address: '5 Kamwala South, Lusaka', departmentId: 'd5',
    position: 'Customer Service Officer', employmentType: 'Full-time', dateJoined: '2022-09-19', managerId: 'e9',
    status: 'On Leave', avatarHue: 8, basicSalary: 6500, housingAllowance: 800, transportAllowance: 800,
    otherAllowance: 200, taxRate: 0.17, bankName: 'Indo-Zambia Bank', accountNumber: '**** 9901',
    emergencyContact: 'Ben Ngoma', emergencyPhone: '+260 96 990 1100',
  }),
  person({
    id: 'e14', employeeId: 'ZTS-1046', firstName: 'Andrew', lastName: 'Sakala',
    email: 'andrew.sakala@zamtech.co.zm', role: 'manager', gender: 'Male', dateOfBirth: '1992-04-08',
    phone: '+260 97 881 4420', address: '14 Makeni, Lusaka', departmentId: 'd6',
    position: 'Operations Manager', employmentType: 'Full-time', dateJoined: '2022-11-07', managerId: 'e1',
    status: 'Active', avatarHue: 175, basicSalary: 14000, housingAllowance: 1500, transportAllowance: 1000,
    otherAllowance: 400, taxRate: 0.23, bankName: 'Stanbic Zambia', accountNumber: '**** 8814',
    emergencyContact: 'Amina Sakala', emergencyPhone: '+260 97 881 4400',
  }),
  person({
    id: 'e15', employeeId: 'ZTS-1009', firstName: 'Chileshe', lastName: 'Banda',
    email: 'chileshe.banda@zamtech.co.zm', role: 'admin', gender: 'Female', dateOfBirth: '1985-12-21',
    phone: '+260 95 334 7782', address: '8 Ibex Hill, Lusaka', departmentId: 'd4',
    position: 'Payroll Officer', employmentType: 'Full-time', dateJoined: '2019-02-25', managerId: 'e5',
    status: 'Active', avatarHue: 22, basicSalary: 9500, housingAllowance: 1000, transportAllowance: 1000,
    otherAllowance: 300, taxRate: 0.2, bankName: 'Zanaco', accountNumber: '**** 3347',
    emergencyContact: 'Erik Banda', emergencyPhone: '+260 95 334 7700',
  }),
  person({
    id: 'e16', employeeId: 'ZTS-1060', firstName: 'Loveness', lastName: 'Phiri',
    email: 'loveness.phiri@zamtech.co.zm', role: 'employee', gender: 'Female', dateOfBirth: '1998-01-09',
    phone: '+260 96 441 2260', address: '31 Garden House, Lusaka', departmentId: 'd6',
    position: 'Operations Coordinator', employmentType: 'Full-time', dateJoined: '2025-11-03', managerId: 'e14',
    status: 'Active', avatarHue: 45, basicSalary: 6000, housingAllowance: 800, transportAllowance: 800,
    otherAllowance: 0, taxRate: 0.16, bankName: 'FNB Zambia', accountNumber: '**** 4412',
    emergencyContact: 'Tapson Phiri', emergencyPhone: '+260 96 441 2200',
  }),
]

const departments: Department[] = [
  { id: 'd1', name: 'Human Resources', managerId: 'e1', description: 'Talent, employee relations, and the ZamTech people journey from offer to alumni.' },
  { id: 'd2', name: 'Information Technology', managerId: 'e2', description: 'Software, infrastructure, and internal systems for clients across Zambia.' },
  { id: 'd3', name: 'Marketing', managerId: 'e4', description: 'Brand, campaigns, and market work for Lusaka and the provinces.' },
  { id: 'd4', name: 'Finance', managerId: 'e5', description: 'Planning, payroll, NAPSA, and ZRA compliance.' },
  { id: 'd5', name: 'Customer Service', managerId: 'e9', description: 'Support, account care, and service quality for ZamTech clients.' },
  { id: 'd6', name: 'Operations', managerId: 'e14', description: 'Delivery, facilities, and day-to-day running of the Lusaka office.' },
  { id: 'd7', name: 'Administration', managerId: 'e1', description: 'Records, reception, and office administration.' },
]

const positions: Position[] = [
  { id: 'p1', title: 'HR Manager', departmentId: 'd1' },
  { id: 'p2', title: 'HR Officer', departmentId: 'd1' },
  { id: 'p3', title: 'Recruitment Specialist', departmentId: 'd1' },
  { id: 'p4', title: 'IT Manager', departmentId: 'd2' },
  { id: 'p5', title: 'Senior Software Engineer', departmentId: 'd2' },
  { id: 'p6', title: 'Software Developer', departmentId: 'd2' },
  { id: 'p7', title: 'Marketing Manager', departmentId: 'd3' },
  { id: 'p8', title: 'Marketing Officer', departmentId: 'd3' },
  { id: 'p9', title: 'Finance Manager', departmentId: 'd4' },
  { id: 'p10', title: 'Payroll Officer', departmentId: 'd4' },
  { id: 'p11', title: 'Customer Service Manager', departmentId: 'd5' },
  { id: 'p12', title: 'Customer Service Officer', departmentId: 'd5' },
  { id: 'p13', title: 'Operations Manager', departmentId: 'd6' },
  { id: 'p14', title: 'Operations Coordinator', departmentId: 'd6' },
  { id: 'p15', title: 'Administration Officer', departmentId: 'd7' },
]

function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  return d
}

function generateAttendance(today: Date): AttendanceRecord[] {
  const records: AttendanceRecord[] = []
  let i = 0
  const lateIds = new Set(['e6', 'e10'])
  const remoteIds = new Set(['e16'])

  for (let offset = 14; offset >= 0; offset--) {
    const day = addDays(today, -offset)
    if (day.getDay() === 0 || day.getDay() === 6) continue
    const date = isoDate(day)
    const isToday = offset === 0

    for (const emp of employees) {
      if (emp.status === 'Inactive') continue
      i += 1
      if (emp.id === 'e13' && date >= '2026-09-03') {
        records.push({
          id: `a${i}`, employeeId: emp.id, date, clockIn: null, clockOut: null,
          breakMinutes: 0, hours: 0, status: 'On Leave', note: 'Approved annual leave',
        })
        continue
      }

      if (isToday) {
        if (lateIds.has(emp.id)) {
          records.push({
            id: `a${i}`, employeeId: emp.id, date, clockIn: '09:24', clockOut: null,
            breakMinutes: 0, hours: 0, status: 'Late', note: '',
          })
        } else if (remoteIds.has(emp.id)) {
          records.push({
            id: `a${i}`, employeeId: emp.id, date, clockIn: '08:52', clockOut: null,
            breakMinutes: 0, hours: 0, status: 'Remote', note: 'Field day in Kafue',
          })
        } else if (emp.id === 'e3') {
          records.push({
            id: `a${i}`, employeeId: emp.id, date, clockIn: null, clockOut: null,
            breakMinutes: 0, hours: 0, status: 'Absent', note: '',
          })
        } else {
          records.push({
            id: `a${i}`, employeeId: emp.id, date, clockIn: emp.role === 'admin' ? '08:12' : '08:46',
            clockOut: null, breakMinutes: 0, hours: 0, status: 'Present', note: '',
          })
        }
        continue
      }

      const late = i % 9 === 0
      records.push({
        id: `a${i}`, employeeId: emp.id, date,
        clockIn: late ? '09:18' : '08:44', clockOut: late ? '17:42' : '17:12',
        breakMinutes: 45, hours: late ? 7.7 : 8.4, status: late ? 'Late' : 'Present', note: '',
      })
    }
  }
  return records
}

function leaveBalances(): LeaveBalance[] {
  return employees.map((e) => ({
    employeeId: e.id,
    annual: e.id === 'e13' ? 6 : 12 + (e.id.charCodeAt(1) % 6),
    sick: 8,
    maternity: e.gender === 'Female' ? 60 : 0,
    paternity: e.gender === 'Male' ? 10 : 0,
    emergency: 3,
    unpaid: 5,
  }))
}

const leaveRequests: LeaveRequest[] = [
  {
    id: 'l1', employeeId: 'e13', type: 'Annual Leave', startDate: '2026-09-03', endDate: '2026-09-10',
    days: 6, reason: 'Family visit in Chipata after the Q3 campaign close.', status: 'Approved',
    reviewedBy: 'e9', reviewedAt: '2026-08-28T10:12:00', reviewNote: 'Cover arranged with Brian.',
    createdAt: '2026-08-26T09:00:00',
  },
  {
    id: 'l2', employeeId: 'e3', type: 'Sick Leave', startDate: '2026-09-08', endDate: '2026-09-09',
    days: 2, reason: 'Medical appointment at UTH and recovery.', status: 'Pending',
    reviewedBy: null, reviewedAt: null, reviewNote: '', createdAt: '2026-09-06T16:40:00',
  },
  {
    id: 'l3', employeeId: 'e8', type: 'Annual Leave', startDate: '2026-09-18', endDate: '2026-09-22',
    days: 3, reason: 'Long weekend in Siavonga.', status: 'Pending',
    reviewedBy: null, reviewedAt: null, reviewNote: '', createdAt: '2026-09-05T11:22:00',
  },
  {
    id: 'l4', employeeId: 'e12', type: 'Emergency Leave', startDate: '2026-08-14', endDate: '2026-08-14',
    days: 1, reason: 'Urgent family matter in Kabwe.', status: 'Approved',
    reviewedBy: 'e2', reviewedAt: '2026-08-14T08:05:00', reviewNote: 'Approved same morning.',
    createdAt: '2026-08-14T07:40:00',
  },
  {
    id: 'l5', employeeId: 'e6', type: 'Unpaid Leave', startDate: '2026-09-21', endDate: '2026-09-21',
    days: 1, reason: 'Personal errand that cannot be moved.', status: 'Rejected',
    reviewedBy: 'e4', reviewedAt: '2026-09-02T14:00:00',
    reviewNote: 'Peak campaign week — please pick another date.', createdAt: '2026-09-01T09:15:00',
  },
  {
    id: 'l6', employeeId: 'e10', type: 'Annual Leave', startDate: '2026-10-05', endDate: '2026-10-09',
    days: 5, reason: 'Pre-booked travel to Ndola.', status: 'Pending',
    reviewedBy: null, reviewedAt: null, reviewNote: '', createdAt: '2026-09-04T13:08:00',
  },
]

function payrolls(): PayrollRecord[] {
  const rows: PayrollRecord[] = []
  const periods = ['2026-07', '2026-08']
  let n = 0
  for (const period of periods) {
    for (const e of employees) {
      n += 1
      const allowances = e.housingAllowance + e.transportAllowance + e.otherAllowance
      const deductions = Math.round(e.basicSalary * 0.02)
      const tax = Math.round((e.basicSalary + allowances) * e.taxRate)
      rows.push({
        id: `pay${n}`, employeeId: e.id, period, basicSalary: e.basicSalary,
        housing: e.housingAllowance, transport: e.transportAllowance, other: e.otherAllowance,
        deductions, tax, net: e.basicSalary + allowances - deductions - tax,
        status: 'Paid', processedAt: `${period}-28T10:00:00`,
      })
    }
  }
  return rows
}

const vacancies: Vacancy[] = [
  {
    id: 'v1', title: 'Marketing Executive', departmentId: 'd3', location: 'Lusaka · Hybrid',
    employmentType: 'Full-time',
    description: 'Plan campaigns and client content for ZamTech products across Lusaka and the Copperbelt.',
    closingDate: '2026-09-30', status: 'Open', createdAt: '2026-08-12',
  },
  {
    id: 'v2', title: 'HR Coordinator', departmentId: 'd1', location: 'Lusaka · On-site',
    employmentType: 'Full-time',
    description: 'Support onboarding, employee records, and the daily rhythm of Human Resources.',
    closingDate: '2026-09-18', status: 'Open', createdAt: '2026-08-20',
  },
  {
    id: 'v3', title: 'Software Engineer', departmentId: 'd2', location: 'Lusaka · Hybrid',
    employmentType: 'Full-time',
    description: 'Build and maintain client systems with the Information Technology team.',
    closingDate: '2026-10-10', status: 'Open', createdAt: '2026-08-28',
  },
  {
    id: 'v4', title: 'Customer Service Intern', departmentId: 'd5', location: 'Lusaka',
    employmentType: 'Intern',
    description: 'A 6-month internship supporting the call desk and client follow-up.',
    closingDate: '2026-08-31', status: 'Closed', createdAt: '2026-07-01',
  },
]

const applications: Application[] = [
  { id: 'ap1', vacancyId: 'v1', candidateName: 'Mutale Mwansa', email: 'mutale.m@example.com', phone: '+260 97 100 8891', stage: 'Interview', appliedAt: '2026-08-18', notes: 'Strong campaign portfolio. UNZA graduate.' },
  { id: 'ap2', vacancyId: 'v1', candidateName: 'Chama Kalumba', email: 'chama.k@example.com', phone: '+260 96 200 4410', stage: 'Shortlisted', appliedAt: '2026-08-21', notes: 'Digital and radio mix.' },
  { id: 'ap3', vacancyId: 'v2', candidateName: 'Bupe Chanda', email: 'bupe.c@example.com', phone: '+260 95 300 2218', stage: 'Screening', appliedAt: '2026-08-25', notes: 'HR diploma, warm communicator.' },
  { id: 'ap4', vacancyId: 'v2', candidateName: 'Musonda Kabwe', email: 'musonda.k@example.com', phone: '+260 97 400 1182', stage: 'Applied', appliedAt: '2026-09-01', notes: '' },
  { id: 'ap5', vacancyId: 'v3', candidateName: 'Tapson Banda', email: 'tapson.b@example.com', phone: '+260 96 500 7731', stage: 'Selected', appliedAt: '2026-08-30', notes: 'Offer pending references.' },
  { id: 'ap6', vacancyId: 'v3', candidateName: 'Namukolo Mweemba', email: 'namukolo.m@example.com', phone: '+260 97 600 3344', stage: 'Rejected', appliedAt: '2026-08-29', notes: 'Strong developer, not a match for this stack.' },
  { id: 'ap7', vacancyId: 'v1', candidateName: 'Lydia Mutale', email: 'lydia.m@example.com', phone: '+260 95 700 9910', stage: 'Hired', appliedAt: '2026-08-14', notes: 'Joined as contractor support.' },
]

const interviews: Interview[] = [
  { id: 'i1', applicationId: 'ap1', scheduledAt: '2026-09-09T10:00:00', interviewer: 'Mulenga Tembo', location: 'ZamTech · 2nd floor', notes: 'Portfolio walkthrough and campaign case.' },
  { id: 'i2', applicationId: 'ap5', scheduledAt: '2026-09-08T14:30:00', interviewer: 'Lackson Phiri', location: 'Google Meet', notes: 'Final round with Information Technology.' },
]

const reviews: PerformanceReview[] = [
  {
    id: 'r1', employeeId: 'e3', reviewerId: 'e2', period: 'H1 2026', overall: 4.6, goalsAchieved: 5,
    strengths: 'Technical depth, calm incident leadership, generous mentoring of Blessings.',
    improvements: 'Delegate earlier on platform work; protect focus time.',
    managerComments: 'Chanda is a cornerstone of the IT culture.',
    employeeComments: 'Grateful for the stretch on reliability work. Would like more client exposure.',
    createdAt: '2026-07-02',
  },
  {
    id: 'r2', employeeId: 'e6', reviewerId: 'e4', period: 'H1 2026', overall: 3.8, goalsAchieved: 3,
    strengths: 'Relationship-building and persistence on long cycles.',
    improvements: 'Forecast accuracy and CRM hygiene.',
    managerComments: 'Solid half. Tighten weekly pipeline reviews.',
    employeeComments: 'Agreed — I will keep the board current.',
    createdAt: '2026-07-04',
  },
  {
    id: 'r3', employeeId: 'e12', reviewerId: 'e2', period: 'Probation 90d', overall: 4.2, goalsAchieved: 4,
    strengths: 'Craft quality, curiosity, excellent pairing.',
    improvements: 'Broader system context beyond the UI layer.',
    managerComments: 'Confirmed in role. Keep pairing with Chanda on architecture.',
    employeeComments: 'The onboarding path was clear and kind.',
    createdAt: '2026-06-20',
  },
  {
    id: 'r4', employeeId: 'e7', reviewerId: 'e1', period: 'H1 2026', overall: 4.8, goalsAchieved: 6,
    strengths: 'Judgement, discretion, and employee trust.',
    improvements: 'Document playbooks so the team can scale.',
    managerComments: 'Mwaka is ready for a larger HR Officer scope.',
    employeeComments: 'I would like to own onboarding end-to-end.',
    createdAt: '2026-07-01',
  },
]

const goals: Goal[] = [
  { id: 'g1', employeeId: 'e3', title: 'Reduce P1 incident time-to-recover', kpi: 'MTTR < 45 min', progress: 72, dueDate: '2026-12-15' },
  { id: 'g2', employeeId: 'e3', title: 'Mentor two engineers to ship independently', kpi: '2 confirmed owners', progress: 50, dueDate: '2026-11-30' },
  { id: 'g3', employeeId: 'e6', title: 'Close Q3 enterprise pipeline', kpi: 'K2.4m booked', progress: 64, dueDate: '2026-09-30' },
  { id: 'g4', employeeId: 'e12', title: 'Ship employee self-service attendance', kpi: 'Released to prod', progress: 88, dueDate: '2026-09-20' },
  { id: 'g5', employeeId: 'e10', title: 'Department headcount dashboard', kpi: 'Weekly auto-report', progress: 40, dueDate: '2026-10-01' },
]

const trainings: TrainingProgram[] = [
  {
    id: 't1', title: 'People Leadership Studio',
    description: 'A three-session studio on feedback, 1:1s, and fair performance conversations.',
    trainer: 'Natasha Banda', date: '2026-09-16', duration: '6 hours',
    location: 'ZamTech boardroom, Lusaka', status: 'Upcoming',
  },
  {
    id: 't2', title: 'Secure Engineering Practices',
    description: 'Threat modelling, secrets hygiene, and practical reviews for product teams.',
    trainer: 'Andrew Sakala', date: '2026-08-20', duration: '4 hours',
    location: 'IT lab', status: 'Completed',
  },
  {
    id: 't3', title: 'Customer Conversation Craft',
    description: 'Discovery questions, objection handling, and writing that earns trust.',
    trainer: 'Gift Mwanza', date: '2026-09-11', duration: '3 hours',
    location: 'Customer Service floor', status: 'In Progress',
  },
  {
    id: 't4', title: 'Payroll & ZRA Refresh',
    description: 'NAPSA, PAYE, leave accruals, and payslip accuracy in Kwacha.',
    trainer: 'Chileshe Banda', date: '2026-10-02', duration: '2 hours',
    location: 'Finance room + virtual', status: 'Upcoming',
  },
]

const trainingAssignments: TrainingAssignment[] = [
  { id: 'ta1', trainingId: 't1', employeeId: 'e2', progress: 0, completed: false, certificate: false },
  { id: 'ta2', trainingId: 't1', employeeId: 'e4', progress: 0, completed: false, certificate: false },
  { id: 'ta3', trainingId: 't1', employeeId: 'e9', progress: 0, completed: false, certificate: false },
  { id: 'ta4', trainingId: 't2', employeeId: 'e3', progress: 100, completed: true, certificate: true },
  { id: 'ta5', trainingId: 't2', employeeId: 'e8', progress: 100, completed: true, certificate: true },
  { id: 'ta6', trainingId: 't2', employeeId: 'e12', progress: 100, completed: true, certificate: true },
  { id: 'ta7', trainingId: 't2', employeeId: 'e14', progress: 100, completed: true, certificate: true },
  { id: 'ta8', trainingId: 't3', employeeId: 'e6', progress: 45, completed: false, certificate: false },
  { id: 'ta9', trainingId: 't3', employeeId: 'e13', progress: 20, completed: false, certificate: false },
  { id: 'ta10', trainingId: 't4', employeeId: 'e7', progress: 0, completed: false, certificate: false },
  { id: 'ta11', trainingId: 't4', employeeId: 'e15', progress: 0, completed: false, certificate: false },
  { id: 'ta12', trainingId: 't1', employeeId: 'e5', progress: 0, completed: false, certificate: false },
]

const documents: HRDocument[] = [
  { id: 'doc1', name: 'Employment Contract — Chanda Mwila', category: 'Contracts', ownerId: 'e3', visibility: 'employee', uploadedAt: '2021-02-08', size: '240 KB', content: 'Standard ZamTech Solutions Ltd employment agreement covering role, remuneration in Zambian Kwacha, and confidentiality.' },
  { id: 'doc2', name: 'Offer Letter — Blessings Mumba', category: 'Offer letters', ownerId: 'e12', visibility: 'employee', uploadedAt: '2024-02-20', size: '128 KB', content: 'Offer of employment as Software Developer reporting to Lackson Phiri. Basic salary K8,000 plus allowances.' },
  { id: 'doc3', name: 'Remote Work Policy 2026', category: 'Policies', ownerId: null, visibility: 'all', uploadedAt: '2026-01-15', size: '310 KB', content: 'Hybrid working rhythm: core hours 09:30–15:30, two office days at Rhodes Park for most teams.' },
  { id: 'doc4', name: 'Leave Policy', category: 'Policies', ownerId: null, visibility: 'all', uploadedAt: '2025-12-01', size: '198 KB', content: 'Annual, sick, parental, and unpaid leave rules including notice periods under Zambian employment law.' },
  { id: 'doc5', name: 'Secure Engineering Certificate — Chanda Mwila', category: 'Certificates', ownerId: 'e3', visibility: 'employee', uploadedAt: '2026-08-20', size: '96 KB', content: 'Completed Secure Engineering Practices with distinction.' },
  { id: 'doc6', name: 'H1 Performance Pack — Information Technology', category: 'Performance', ownerId: null, visibility: 'hr', uploadedAt: '2026-07-08', size: '1.2 MB', content: 'Aggregated ratings, calibration notes, and promotion recommendations.' },
  { id: 'doc7', name: 'Code of Conduct', category: 'Policies', ownerId: null, visibility: 'all', uploadedAt: '2025-03-01', size: '150 KB', content: 'How we treat one another, clients, and information at ZamTech Solutions Ltd.' },
]

const announcements: Announcement[] = [
  {
    id: 'an1', title: 'Independence Day office close',
    body: 'The Lusaka office will close at 13:00 on 23 October ahead of Independence Day. Please submit leave if you are taking Friday as well.',
    authorId: 'e1', category: 'Holidays', date: '2026-09-05', pinned: true,
  },
  {
    id: 'an2', title: 'September all-hands',
    body: 'Join us Thursday 10 September, 16:00 in the ZamTech boardroom. We will share Q3 people metrics and the 2027 hiring plan.',
    authorId: 'e1', category: 'Meetings', date: '2026-09-02', pinned: true,
  },
  {
    id: 'an3', title: 'Updated remote work policy',
    body: 'Core hours are now 09:30–15:30. Two office days in Rhodes Park remain the default. Read the policy in Documents.',
    authorId: 'e7', category: 'Policy', date: '2026-08-18', pinned: false,
  },
  {
    id: 'an4', title: 'Marketing open afternoon',
    body: 'Marketing hosts an open campaign review Friday 12 September, 14:00. All departments welcome.',
    authorId: 'e4', category: 'Events', date: '2026-09-06', pinned: false,
  },
  {
    id: 'an5', title: 'Payroll cut-off reminder',
    body: 'August adjustments close 18 September at 12:00. Speak to Chileshe Banda for overtime or expense queries.',
    authorId: 'e15', category: 'Notice', date: '2026-09-04', pinned: false,
  },
]

const tasks: WorkTask[] = [
  { id: 'tk1', title: 'Ship attendance calendar polish', description: 'Complete empty states and mobile card layout for self-service attendance.', assigneeId: 'e12', assignerId: 'e2', dueDate: '2026-09-12', status: 'In Progress', priority: 'High' },
  { id: 'tk2', title: 'Q3 reliability retro notes', description: 'Summarise P1s and proposed runbook updates.', assigneeId: 'e3', assignerId: 'e2', dueDate: '2026-09-09', status: 'To Do', priority: 'Medium' },
  { id: 'tk3', title: 'Prepare Mutale interview pack', description: 'Print campaign samples and scorecard for Tuesday.', assigneeId: 'e4', assignerId: 'e11', dueDate: '2026-09-08', status: 'To Do', priority: 'High' },
  { id: 'tk4', title: 'Refresh onboarding checklist', description: 'Add laptop imaging and buddy matching steps.', assigneeId: 'e7', assignerId: 'e1', dueDate: '2026-09-15', status: 'In Progress', priority: 'Medium' },
  { id: 'tk5', title: 'Follow up MTN Zambia renewal', description: 'Send commercial proposal and book success review.', assigneeId: 'e6', assignerId: 'e4', dueDate: '2026-09-10', status: 'To Do', priority: 'High' },
  { id: 'tk6', title: 'Department payroll variance note', description: 'Explain August overtime spike in Information Technology.', assigneeId: 'e15', assignerId: 'e5', dueDate: '2026-09-11', status: 'Done', priority: 'Low' },
]

export function buildSeed(today = new Date(2026, 8, 7)): AppState {
  const attendance = generateAttendance(today)
  return {
    employees,
    departments,
    positions,
    attendance,
    leaveBalances: leaveBalances(),
    leaveRequests,
    payrolls: payrolls(),
    vacancies,
    applications,
    interviews,
    reviews,
    goals,
    trainings,
    trainingAssignments,
    documents,
    announcements,
    tasks,
    notifications: [
      { id: 'n1', userId: 'e1', title: 'Leave request awaiting review', body: 'Chanda Mwila submitted sick leave for 8–9 Sep.', type: 'leave', read: false, createdAt: '2026-09-06T16:41:00' },
      { id: 'n2', userId: 'e1', title: 'New application', body: 'Musonda Kabwe applied for HR Coordinator.', type: 'recruitment', read: false, createdAt: '2026-09-01T09:12:00' },
      { id: 'n3', userId: 'e1', title: 'Interview tomorrow', body: 'Tapson Banda · Software Engineer with Lackson Phiri.', type: 'recruitment', read: true, createdAt: '2026-09-07T08:00:00' },
      { id: 'n4', userId: 'e2', title: 'Pending leave in Information Technology', body: 'Kelvin Phiri requested annual leave 18–22 Sep.', type: 'leave', read: false, createdAt: '2026-09-05T11:22:00' },
      { id: 'n5', userId: 'e3', title: 'Training certificate ready', body: 'Secure Engineering Practices certificate is in Documents.', type: 'training', read: false, createdAt: '2026-08-20T17:00:00' },
      { id: 'n6', userId: 'e3', title: 'Payslip available', body: 'August 2026 payslip has been released.', type: 'payroll', read: true, createdAt: '2026-08-28T10:05:00' },
      { id: 'n7', userId: 'e3', title: 'New announcement', body: 'Independence Day office close published.', type: 'announcement', read: false, createdAt: '2026-09-05T09:00:00' },
      { id: 'n8', userId: 'e12', title: 'Task assigned', body: 'Ship attendance calendar polish is due 12 Sep.', type: 'task', read: false, createdAt: '2026-09-04T11:00:00' },
    ],
    activities: [
      { id: 'ac1', text: `${fullName(employees[11]!)} clocked in`, time: '2026-09-07T08:46:00', kind: 'attendance' },
      { id: 'ac2', text: `${fullName(employees[2]!)} submitted a sick leave request`, time: '2026-09-06T16:40:00', kind: 'leave' },
      { id: 'ac3', text: 'August payroll marked as paid', time: '2026-08-28T10:00:00', kind: 'payroll' },
      { id: 'ac4', text: `${fullName(employees[2]!)} completed a performance review`, time: '2026-07-02T14:00:00', kind: 'performance' },
      { id: 'ac5', text: `${fullName(employees[15]!)} joined Operations`, time: '2025-11-03T09:00:00', kind: 'employee' },
      { id: 'ac6', text: 'Musonda Kabwe applied for HR Coordinator', time: '2026-09-01T09:12:00', kind: 'recruitment' },
    ],
    settings,
    leaveTypeDays: {
      'Annual Leave': 18,
      'Sick Leave': 10,
      'Maternity Leave': 60,
      'Paternity Leave': 10,
      'Emergency Leave': 3,
      'Unpaid Leave': 5,
    },
  }
}

export const DEMO_ACCOUNTS = [
  { label: 'HR Manager', email: 'hr@zamtech.co.zm', password: DEMO_PASSWORD, role: 'Admin' },
  { label: 'IT Manager', email: 'manager@zamtech.co.zm', password: DEMO_PASSWORD, role: 'Manager' },
  { label: 'Employee', email: 'employee@zamtech.co.zm', password: DEMO_PASSWORD, role: 'Employee' },
]
