import type { Gender, LeaveBalance, LeaveType } from '../types'
import { leaveKey } from './format'

export const LEAVE_TYPES: LeaveType[] = [
  'Annual Leave',
  'Sick Leave',
  'Maternity Leave',
  'Paternity Leave',
  'Compassionate Leave',
  'Study Leave',
  'Emergency Leave',
  'Unpaid Leave',
]

export function normalizeGender(gender: Gender | string | undefined): string {
  return String(gender || '').trim().toLowerCase()
}

export function leaveEligibilityError(gender: Gender | string | undefined, type: LeaveType): string | null {
  const key = normalizeGender(gender)
  if (type === 'Maternity Leave' && key !== 'female') {
    return 'Maternity Leave is available only to female employees, based on the gender recorded on the employee profile.'
  }
  if (type === 'Paternity Leave' && key !== 'male') {
    return 'Paternity Leave is available only to male employees, based on the gender recorded on the employee profile.'
  }
  return null
}

export function eligibleLeaveTypes(gender: Gender | string | undefined): LeaveType[] {
  return LEAVE_TYPES.filter((type) => !leaveEligibilityError(gender, type))
}

export function visibleLeaveBalances(
  gender: Gender | string | undefined,
  balance: LeaveBalance | undefined,
): { type: LeaveType; days: number }[] {
  return eligibleLeaveTypes(gender).map((type) => ({
    type,
    days: Number(balance?.[leaveKey(type)] ?? 0),
  }))
}
