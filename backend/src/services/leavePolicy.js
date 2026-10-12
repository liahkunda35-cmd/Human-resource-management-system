const GENDER_RULES = {
  'Maternity Leave': {
    required: 'female',
    message:
      'Maternity Leave is available only to female employees, based on the gender recorded on the employee profile.',
  },
  'Paternity Leave': {
    required: 'male',
    message:
      'Paternity Leave is available only to male employees, based on the gender recorded on the employee profile.',
  },
}

export const BALANCE_COLUMNS = new Set([
  'annual',
  'sick',
  'maternity',
  'paternity',
  'emergency',
  'unpaid',
  'compassionate',
  'study',
])

export function normalizeGender(gender) {
  return String(gender || '').trim().toLowerCase()
}

export function leaveEligibilityError(gender, leaveTypeName, restriction) {
  const rule = GENDER_RULES[leaveTypeName]
  const required = restriction || rule?.required || null
  if (!required) return null
  const genderKey = normalizeGender(gender)
  if (genderKey === required) return null
  if (rule?.message && leaveTypeName in GENDER_RULES) return rule.message
  if (required === 'female') {
    return 'This leave type is available only to female employees, based on the gender recorded on the employee profile.'
  }
  if (required === 'male') {
    return 'This leave type is available only to male employees, based on the gender recorded on the employee profile.'
  }
  return 'You are not eligible for this leave type.'
}

export function countLeaveDays(startDate, endDate) {
  const start = new Date(`${startDate}T12:00:00`)
  const end = new Date(`${endDate}T12:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  let days = 0
  const cursor = new Date(start)
  while (cursor <= end) {
    const dow = cursor.getDay()
    if (dow !== 0 && dow !== 6) days += 1
    cursor.setDate(cursor.getDate() + 1)
  }
  return Math.max(days, start <= end ? 1 : 0)
}
