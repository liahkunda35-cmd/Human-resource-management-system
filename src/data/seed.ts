import type {
  AppState,
  AttendanceRecord,
  Department,
  Employee,
  Internship,
  InternshipApplication,
  LeaveBalance,
  LeaveRequest,
  OrgSettings,
  Position,
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

const leaveSickNoteNull = {
  sickNoteName: null as string | null,
  sickNoteData: null as string | null,
  sickNoteMime: null as string | null,
}

const leaveRequests: LeaveRequest[] = [
  {
    id: 'l1', employeeId: 'e13', type: 'Annual Leave', startDate: '2026-09-03', endDate: '2026-09-10',
    days: 6, reason: 'Family visit in Chipata after the Q3 campaign close.', status: 'Approved',
    reviewedBy: 'e9', reviewedAt: '2026-08-28T10:12:00', reviewNote: 'Cover arranged with Brian.',
    createdAt: '2026-08-26T09:00:00', ...leaveSickNoteNull,
  },
  {
    id: 'l2', employeeId: 'e3', type: 'Sick Leave', startDate: '2026-09-08', endDate: '2026-09-09',
    days: 2, reason: 'Medical appointment at UTH and recovery.', status: 'Pending',
    reviewedBy: null, reviewedAt: null, reviewNote: '', createdAt: '2026-09-06T16:40:00',
    sickNoteName: null, sickNoteData: null, sickNoteMime: null,
  },
  {
    id: 'l3', employeeId: 'e8', type: 'Annual Leave', startDate: '2026-09-18', endDate: '2026-09-22',
    days: 3, reason: 'Long weekend in Siavonga.', status: 'Pending',
    reviewedBy: null, reviewedAt: null, reviewNote: '', createdAt: '2026-09-05T11:22:00', ...leaveSickNoteNull,
  },
  {
    id: 'l4', employeeId: 'e12', type: 'Emergency Leave', startDate: '2026-08-14', endDate: '2026-08-14',
    days: 1, reason: 'Urgent family matter in Kabwe.', status: 'Approved',
    reviewedBy: 'e2', reviewedAt: '2026-08-14T08:05:00', reviewNote: 'Approved same morning.',
    createdAt: '2026-08-14T07:40:00', ...leaveSickNoteNull,
  },
  {
    id: 'l5', employeeId: 'e6', type: 'Unpaid Leave', startDate: '2026-09-21', endDate: '2026-09-21',
    days: 1, reason: 'Personal errand that cannot be moved.', status: 'Rejected',
    reviewedBy: 'e4', reviewedAt: '2026-09-02T14:00:00',
    reviewNote: 'Peak campaign week — please pick another date.', createdAt: '2026-09-01T09:15:00', ...leaveSickNoteNull,
  },
  {
    id: 'l6', employeeId: 'e10', type: 'Annual Leave', startDate: '2026-10-05', endDate: '2026-10-09',
    days: 5, reason: 'Pre-booked travel to Ndola.', status: 'Pending',
    reviewedBy: null, reviewedAt: null, reviewNote: '', createdAt: '2026-09-04T13:08:00', ...leaveSickNoteNull,
  },
]

const internships: Internship[] = [
  {
    id: 'int1',
    title: 'Software Development Internship',
    departmentId: 'd2',
    description: 'Internship opportunity for students interested in software development, APIs, and product delivery with the Information Technology team.',
    requirements: 'Currently studying IT/Computer Science or related field\nBasic programming knowledge\nWillingness to learn in a team environment',
    location: 'Lusaka',
    duration: '3 Months',
    deadline: '2026-10-15',
    status: 'Open',
    createdBy: 'e1',
    createdAt: '2026-09-01T09:00:00',
  },
]

const internshipApplications: InternshipApplication[] = []


export function buildSeed(today = new Date(2026, 8, 7)): AppState {
  const attendance = generateAttendance(today)
  return {
    employees,
    departments,
    positions,
    attendance,
    leaveBalances: leaveBalances(),
    leaveRequests,
    internships,
    internshipApplications,
    passwordResetTokens: [],
    notifications: [
      { id: 'n1', userId: 'e1', title: 'Leave request awaiting review', body: 'Chanda Mwila submitted sick leave for 8–9 Sep.', type: 'leave', read: false, createdAt: '2026-09-06T16:41:00' },
      { id: 'n2', userId: 'e2', title: 'Pending leave in Information Technology', body: 'Kelvin Phiri requested annual leave 18–22 Sep.', type: 'leave', read: false, createdAt: '2026-09-05T11:22:00' },
      { id: 'n3', userId: 'e3', title: 'Leave approved', body: 'Your emergency leave on 14 Aug was approved.', type: 'leave', read: true, createdAt: '2026-08-14T08:05:00' },
      { id: 'n4', userId: 'e12', title: 'Attendance reminder', body: 'Remember to clock in when you arrive.', type: 'attendance', read: false, createdAt: '2026-09-07T07:30:00' },
    ],
    activities: [
      { id: 'ac1', text: `${fullName(employees[11]!)} clocked in`, time: '2026-09-07T08:46:00', kind: 'attendance' },
      { id: 'ac2', text: `${fullName(employees[2]!)} submitted a sick leave request`, time: '2026-09-06T16:40:00', kind: 'leave' },
      { id: 'ac3', text: `${fullName(employees[15]!)} joined Operations`, time: '2025-11-03T09:00:00', kind: 'employee' },
      { id: 'ac4', text: 'Leave request approved for Thandiwe Zulu', time: '2026-08-14T08:05:00', kind: 'leave' },
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
  { label: 'Administrator', email: 'hr@zamtech.co.zm', password: DEMO_PASSWORD, role: 'Administrator' },
  { label: 'HR Manager', email: 'manager@zamtech.co.zm', password: DEMO_PASSWORD, role: 'HR Manager' },
  { label: 'Employee', email: 'employee@zamtech.co.zm', password: DEMO_PASSWORD, role: 'Employee' },
]
