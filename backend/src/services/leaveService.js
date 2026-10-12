import { query, withTransaction } from '../config/db.js'
import { BALANCE_COLUMNS, countLeaveDays, leaveEligibilityError, normalizeGender } from './leavePolicy.js'

const HR_ROLES = new Set(['super_admin', 'admin', 'manager'])
const REVIEWABLE = new Set(['Pending', 'Requires Review', 'Documentation Required'])

function isoDate(value) {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

export function isHr(user) {
  return HR_ROLES.has(user?.role)
}

export async function listLeaveTypes() {
  const { rows } = await query(
    `SELECT code, balance_column, gender_restriction, default_days, sort_order
     FROM leave_types ORDER BY sort_order, code`,
  )
  return rows
}

export function typesForGender(types, gender, onlyEligible = false) {
  const annotated = types.map((type) => {
    const reason = leaveEligibilityError(gender, type.code, type.gender_restriction)
    return {
      name: type.code,
      eligible: !reason,
      reason,
    }
  })
  return onlyEligible ? annotated.filter((type) => type.eligible) : annotated
}

function balanceForGender(row) {
  const gender = row.gender
  const female = normalizeGender(gender) === 'female'
  const male = normalizeGender(gender) === 'male'
  return {
    employeeId: row.user_id,
    gender,
    annual: row.annual,
    sick: row.sick,
    maternity: female ? row.maternity : 0,
    paternity: male ? row.paternity : 0,
    emergency: row.emergency,
    unpaid: row.unpaid,
    compassionate: row.compassionate,
    study: row.study,
  }
}

async function loadBalance(employeeId) {
  const { rows } = await query(`SELECT * FROM leave_balances WHERE employee_id = $1`, [employeeId])
  return rows[0] || null
}

function mapApplication(row) {
  return {
    id: row.id,
    employeeId: row.user_id,
    type: row.leave_type,
    startDate: isoDate(row.start_date),
    endDate: isoDate(row.end_date),
    days: row.days,
    reason: row.reason,
    status: row.status,
    reviewedBy: row.reviewed_by_user_id,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note || '',
    createdAt: row.created_at,
    sickNoteName: row.sick_note_name,
    sickNoteData: row.sick_note_data,
    sickNoteMime: row.sick_note_mime,
  }
}

const APPLICATION_SELECT = `
  SELECT
    la.id,
    la.employee_id,
    e.user_id,
    la.leave_type,
    la.start_date,
    la.end_date,
    la.days,
    la.reason,
    la.status,
    reviewer.user_id AS reviewed_by_user_id,
    la.reviewed_at,
    la.review_note,
    la.sick_note_name,
    la.sick_note_data,
    la.sick_note_mime,
    la.created_at
  FROM leave_applications la
  JOIN employees e ON e.id = la.employee_id
  LEFT JOIN employees reviewer ON reviewer.id = la.reviewed_by
`

export async function listLeave(actor) {
  const types = await listLeaveTypes()
  const params = []
  let where = ''
  if (!isHr(actor)) {
    params.push(actor.employeeId)
    where = 'WHERE la.employee_id = $1'
  } else if (actor.role === 'manager') {
    params.push(actor.departmentId, actor.id)
    where = 'WHERE e.department_id = $1 OR e.user_id = $2'
  }

  const { rows } = await query(
    `${APPLICATION_SELECT} ${where} ORDER BY la.created_at DESC`,
    params,
  )

  const balanceParams = []
  let balanceWhere = ''
  if (!isHr(actor)) {
    balanceParams.push(actor.employeeId)
    balanceWhere = 'WHERE lb.employee_id = $1'
  } else if (actor.role === 'manager') {
    balanceParams.push(actor.departmentId, actor.id)
    balanceWhere = 'WHERE e.department_id = $1 OR e.user_id = $2'
  }

  const balances = await query(
    `SELECT lb.*, e.user_id, e.gender
     FROM leave_balances lb
     JOIN employees e ON e.id = lb.employee_id
     ${balanceWhere}`,
    balanceParams,
  )

  return {
    types: typesForGender(types, actor.gender, !isHr(actor)),
    applications: rows.map(mapApplication),
    balances: balances.rows.map(balanceForGender),
  }
}

export async function insertLeaveBalance(client, employeeId, gender) {
  const key = String(gender || '').trim().toLowerCase()
  await client.query(
    `INSERT INTO leave_balances (
       employee_id, annual, sick, maternity, paternity, emergency, unpaid, compassionate, study
     ) VALUES ($1, 18, 10, $2, $3, 3, 5, 5, 5)
     ON CONFLICT (employee_id) DO NOTHING`,
    [employeeId, key === 'female' ? 60 : 0, key === 'male' ? 10 : 0],
  )
}

export async function applyLeave(actor, body) {
  const typeName = String(body?.type || '').trim()
  const startDate = String(body?.startDate || '').slice(0, 10)
  const endDate = String(body?.endDate || '').slice(0, 10)
  const reason = String(body?.reason || '').trim()
  if (!typeName) return { error: 'Choose a leave type.' }
  if (!startDate || !endDate) return { error: 'Choose start and end dates.' }
  if (endDate < startDate) return { error: 'End date cannot be before the start date.' }
  if (!reason) return { error: 'Please share a short reason.' }
  if (reason.length > 2000) return { error: 'Please shorten the reason to 2000 characters or fewer.' }

  const { rows: typeRows } = await query(
    `SELECT code, balance_column, gender_restriction FROM leave_types WHERE code = $1`,
    [typeName],
  )
  const leaveType = typeRows[0]
  if (!leaveType || !BALANCE_COLUMNS.has(leaveType.balance_column)) {
    return { error: 'That leave type is not available.' }
  }

  const { rows: employeeRows } = await query(
    `SELECT id, gender, user_id FROM employees WHERE id = $1`,
    [actor.employeeId],
  )
  const employee = employeeRows[0]
  if (!employee) return { error: 'Employee profile not found.' }

  const eligibility = leaveEligibilityError(employee.gender, leaveType.code, leaveType.gender_restriction)
  if (eligibility) return { error: eligibility }

  const days = countLeaveDays(startDate, endDate)
  if (!days) return { error: 'Choose a valid date range.' }

  const balance = await loadBalance(employee.id)
  const column = leaveType.balance_column
  if (typeName !== 'Unpaid Leave') {
    const remaining = Number(balance?.[column] ?? 0)
    if (remaining < days) {
      return { error: `Only ${remaining} day(s) remaining for ${typeName}.` }
    }
  }

  const overlap = await query(
    `SELECT id FROM leave_applications
     WHERE employee_id = $1
       AND status <> 'Rejected'
       AND start_date <= $3
       AND end_date >= $2
     LIMIT 1`,
    [employee.id, startDate, endDate],
  )
  if (overlap.rows.length) return { error: 'This overlaps an existing leave request.' }

  let sickNoteName = null
  let sickNoteData = null
  let sickNoteMime = null
  if (typeName === 'Sick Leave' && body?.sickNoteData) {
    sickNoteData = String(body.sickNoteData)
    if (sickNoteData.length > 700_000) return { error: 'The medical certificate file is too large.' }
    sickNoteName = String(body.sickNoteName || 'certificate').slice(0, 180)
    sickNoteMime = String(body.sickNoteMime || 'application/octet-stream').slice(0, 120)
  }

  const inserted = await query(
    `INSERT INTO leave_applications (
       employee_id, leave_type, start_date, end_date, days, reason,
       sick_note_name, sick_note_data, sick_note_mime
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`,
    [employee.id, typeName, startDate, endDate, days, reason, sickNoteName, sickNoteData, sickNoteMime],
  )

  const { rows } = await query(`${APPLICATION_SELECT} WHERE la.id = $1`, [inserted.rows[0].id])
  return { application: mapApplication(rows[0]) }
}

export async function reviewLeave(actor, applicationId, status, note) {
  if (!isHr(actor)) return { error: 'You are not authorised to review leave.', statusCode: 403 }
  if (!['Approved', 'Rejected', 'Requires Review', 'Documentation Required'].includes(status)) {
    return { error: 'Choose a valid review decision.' }
  }

  const { rows } = await query(
    `SELECT la.*, e.user_id, e.department_id, lt.balance_column
     FROM leave_applications la
     JOIN employees e ON e.id = la.employee_id
     JOIN leave_types lt ON lt.code = la.leave_type
     WHERE la.id = $1`,
    [applicationId],
  )
  const application = rows[0]
  if (!application) return { error: 'Leave request not found.', statusCode: 404 }
  if (application.user_id === actor.id || application.employee_id === actor.employeeId) {
    return { error: 'You cannot review your own leave request.', statusCode: 403 }
  }
  if (actor.role === 'manager' && application.department_id !== actor.departmentId) {
    return { error: 'You can only review leave for your department.', statusCode: 403 }
  }
  if (!REVIEWABLE.has(application.status)) {
    return { error: 'This leave request has already been closed.' }
  }
  if (!BALANCE_COLUMNS.has(application.balance_column)) {
    return { error: 'That leave type is not available.' }
  }

  await withTransaction(async (client) => {
    if (status === 'Approved' && application.leave_type !== 'Unpaid Leave') {
      const column = application.balance_column
      await client.query(
        `UPDATE leave_balances
         SET ${column} = GREATEST(0, ${column} - $1)
         WHERE employee_id = $2`,
        [application.days, application.employee_id],
      )
    }
    await client.query(
      `UPDATE leave_applications
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_note = $3, updated_at = NOW()
       WHERE id = $4`,
      [status, actor.employeeId, String(note || '').slice(0, 2000), application.id],
    )
  })

  const refreshed = await query(`${APPLICATION_SELECT} WHERE la.id = $1`, [application.id])
  const bundle = await listLeave(actor)
  return { application: mapApplication(refreshed.rows[0]), balances: bundle.balances }
}

export async function attachSickNote(actor, applicationId, file) {
  const { rows } = await query(
    `SELECT la.*, e.user_id
     FROM leave_applications la
     JOIN employees e ON e.id = la.employee_id
     WHERE la.id = $1`,
    [applicationId],
  )
  const application = rows[0]
  if (!application) return { error: 'Leave request not found.', statusCode: 404 }
  if (application.user_id !== actor.id) {
    return { error: 'You can only upload a certificate for your own leave request.', statusCode: 403 }
  }
  if (application.leave_type !== 'Sick Leave') return { error: 'Medical certificates only apply to Sick Leave.' }
  if (application.status === 'Rejected' || application.status === 'Approved') {
    return { error: 'This leave request can no longer accept a medical certificate.' }
  }
  const data = String(file?.data || '')
  if (!data || !file?.name) return { error: 'Choose a medical certificate file to upload.' }
  if (data.length > 700_000) return { error: 'The medical certificate file is too large.' }

  const nextStatus = application.status === 'Documentation Required' ? 'Pending' : application.status
  await query(
    `UPDATE leave_applications
     SET sick_note_name = $1, sick_note_data = $2, sick_note_mime = $3, status = $4, updated_at = NOW()
     WHERE id = $5`,
    [String(file.name).slice(0, 180), data, String(file.mime || 'application/octet-stream').slice(0, 120), nextStatus, application.id],
  )
  const refreshed = await query(`${APPLICATION_SELECT} WHERE la.id = $1`, [application.id])
  return { application: mapApplication(refreshed.rows[0]) }
}
