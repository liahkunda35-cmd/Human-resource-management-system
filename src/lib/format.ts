import type { Employee, LeaveType } from '../types'
import { fullName } from '../types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function parseISO(date: string): Date {
  return new Date(date.includes('T') ? date : `${date}T12:00:00`)
}

export function formatDate(date: string | Date, withWeekday = false): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (Number.isNaN(d.getTime())) return '—'
  const core = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
  return withWeekday ? `${DAYS[d.getDay()].slice(0, 3)}, ${core}` : core
}

export function formatTime(value: string | null): string {
  if (!value) return '—'
  if (value.includes('T')) {
    const d = new Date(value)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return value
}

export function nowTime(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function todayISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function greeting(d = new Date()): string {
  const h = d.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function money(n: number, currency = 'ZMW'): string {
  const decimals = Math.round(Math.abs(n) * 100) % 100 === 0 ? 0 : 2
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: 2,
  }).format(n)
  return currency ? `K${formatted}` : `K${formatted}`
}

export function leaveDays(start: string, end: string): number {
  const a = parseISO(start)
  const b = parseISO(end)
  let days = 0
  const cur = new Date(a)
  while (cur <= b) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) days += 1
    cur.setDate(cur.getDate() + 1)
  }
  return Math.max(days, 1)
}

export function initials(e: Pick<Employee, 'firstName' | 'lastName'>): string {
  return `${e.firstName[0] ?? ''}${e.lastName[0] ?? ''}`.toUpperCase()
}

export function relativeTime(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(iso)
}

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export function hoursBetween(clockIn: string, clockOut: string, breakMinutes: number): number {
  const [ih, im] = clockIn.split(':').map(Number)
  const [oh, om] = clockOut.split(':').map(Number)
  const mins = (oh ?? 0) * 60 + (om ?? 0) - ((ih ?? 0) * 60 + (im ?? 0)) - breakMinutes
  return Math.max(Math.round((mins / 60) * 10) / 10, 0)
}

export function isLate(clockIn: string, workStart = '09:00'): boolean {
  return clockIn > workStart
}

export function employeeName(list: Employee[], id: string): string {
  const e = list.find((x) => x.id === id)
  return e ? fullName(e) : 'Unknown'
}

export function deptName(
  departments: { id: string; name: string }[],
  id: string,
): string {
  return departments.find((d) => d.id === id)?.name ?? '—'
}

export function leaveKey(type: LeaveType): 'annual' | 'sick' | 'maternity' | 'paternity' | 'emergency' | 'unpaid' {
  switch (type) {
    case 'Annual Leave':
      return 'annual'
    case 'Sick Leave':
      return 'sick'
    case 'Maternity Leave':
      return 'maternity'
    case 'Paternity Leave':
      return 'paternity'
    case 'Emergency Leave':
      return 'emergency'
    default:
      return 'unpaid'
  }
}

export function monthLabel(period: string): string {
  const [y, m] = period.split('-')
  const month = MONTHS[Number(m) - 1] ?? period
  return `${month} ${y}`
}

export function toCSV(headers: string[], rows: Array<Array<string | number>>): string {
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n')
}

export function downloadText(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
