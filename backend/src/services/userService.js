import { query, withTransaction } from '../config/db.js'
import {
  generateTemporaryPassword,
  hashPassword,
  verifyPassword,
} from './passwordService.js'
import {
  sendAdminCreatedEmail,
  sendUserCreatedEmail,
  NexusConfigError,
  NexusRequestError,
} from './nexusEmailService.js'

const ROLE_LABEL = {
  super_admin: 'Super Administrator',
  admin: 'Administrator',
  manager: 'HR Manager',
  employee: 'Employee',
}

export function roleLabel(code) {
  return ROLE_LABEL[code] || code
}

const USER_SELECT = `
  SELECT
    u.id,
    u.email,
    u.password_hash,
    u.account_status,
    u.must_change_password,
    u.created_at,
    u.updated_at,
    r.code AS role,
    r.name AS role_name,
    e.id AS employee_id,
    e.employee_code,
    e.first_name,
    e.last_name,
    e.phone,
    e.address,
    e.department_id,
    e.position,
    e.employment_type,
    e.employment_status,
    e.date_joined,
    e.manager_id,
    e.gender,
    e.date_of_birth,
    e.avatar_hue,
    e.basic_salary,
    e.housing_allowance,
    e.transport_allowance,
    e.other_allowance,
    e.tax_rate,
    e.bank_name,
    e.account_number,
    e.emergency_contact,
    e.emergency_phone
  FROM users u
  JOIN roles r ON r.id = u.role_id
  JOIN employees e ON e.user_id = u.id
`

export async function findUserByEmail(email) {
  const { rows } = await query(`${USER_SELECT} WHERE LOWER(u.email) = LOWER($1) LIMIT 1`, [email.trim()])
  return rows[0] || null
}

export async function findUserById(id) {
  const { rows } = await query(`${USER_SELECT} WHERE u.id = $1 LIMIT 1`, [id])
  return rows[0] || null
}

export function toPublicUser(row) {
  if (!row) return null
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeCode: row.employee_code,
    email: row.email,
    role: row.role,
    roleLabel: roleLabel(row.role),
    accountStatus: row.account_status,
    mustChangePassword: row.must_change_password,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    address: row.address,
    departmentId: row.department_id,
    position: row.position,
    employmentType: row.employment_type,
    status: row.employment_status,
    dateJoined: row.date_joined,
    managerId: row.manager_id,
    gender: row.gender,
    dateOfBirth: row.date_of_birth,
    avatarHue: row.avatar_hue,
    basicSalary: Number(row.basic_salary),
    housingAllowance: Number(row.housing_allowance),
    transportAllowance: Number(row.transport_allowance),
    otherAllowance: Number(row.other_allowance),
    taxRate: Number(row.tax_rate),
    bankName: row.bank_name,
    accountNumber: row.account_number,
    emergencyContact: row.emergency_contact,
    emergencyPhone: row.emergency_phone,
  }
}

export async function authenticate(email, password) {
  const user = await findUserByEmail(email)
  if (!user) return { error: 'Those details do not match our records.' }
  if (user.account_status !== 'active') {
    return { error: 'This account has been deactivated. Speak to Human Resources.' }
  }
  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) return { error: 'Those details do not match our records.' }
  return { user: toPublicUser(user) }
}

async function nextEmployeeCode(client) {
  const year = new Date().getFullYear().toString().slice(2)
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS c FROM employees WHERE employee_code LIKE $1`,
    [`ZTS-${year}%`],
  )
  const n = (rows[0]?.c || 0) + 1
  return `ZTS-${year}${String(100 + n).padStart(3, '0')}`
}

async function getRoleId(client, code) {
  const { rows } = await client.query(`SELECT id FROM roles WHERE code = $1`, [code])
  if (!rows[0]) throw new Error(`Unknown role: ${code}`)
  return rows[0].id
}

async function getDefaultDepartmentId(client) {
  const { rows } = await client.query(`SELECT id FROM departments ORDER BY name LIMIT 1`)
  return rows[0]?.id || null
}

/**
 * Creates user + employee, hashes password, then emails via Nexus.
 * Does not return the temporary password to the client.
 */
export async function createAccountWithEmail({
  actor,
  roleCode,
  firstName,
  lastName,
  email,
  phone = '',
  departmentId = null,
  position = '',
  employmentType = 'Full-time',
}) {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { error: 'A valid email address is required.' }
  }
  if (!firstName?.trim() || !lastName?.trim()) {
    return { error: 'First and last name are required.' }
  }

  const existing = await findUserByEmail(normalizedEmail)
  if (existing) return { error: 'An account with this email already exists.' }

  const temporaryPassword = generateTemporaryPassword()
  const passwordHash = await hashPassword(temporaryPassword)

  let created
  try {
    created = await withTransaction(async (client) => {
      const roleId = await getRoleId(client, roleCode)
      const deptId = departmentId || (await getDefaultDepartmentId(client))
      const code = await nextEmployeeCode(client)

      const userRes = await client.query(
        `INSERT INTO users (email, password_hash, role_id, account_status, must_change_password)
         VALUES ($1, $2, $3, 'active', TRUE)
         RETURNING id`,
        [normalizedEmail, passwordHash, roleId],
      )
      const userId = userRes.rows[0].id

      const empRes = await client.query(
        `INSERT INTO employees (
           user_id, employee_code, first_name, last_name, phone, department_id, position,
           employment_type, employment_status, manager_id, avatar_hue
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Active',$9,$10)
         RETURNING id`,
        [
          userId,
          code,
          firstName.trim(),
          lastName.trim(),
          (phone || '').trim(),
          deptId,
          position.trim() || (roleCode === 'admin' ? 'Administrator' : 'Team Member'),
          employmentType,
          actor?.employeeId || null,
          Math.floor(Math.random() * 360),
        ],
      )

      await client.query(
        `INSERT INTO leave_balances (employee_id) VALUES ($1) ON CONFLICT DO NOTHING`,
        [empRes.rows[0].id],
      )

      return { userId, employeeId: empRes.rows[0].id, employeeCode: code }
    })
  } catch (err) {
    if (err.code === '23505') return { error: 'An account with this email already exists.' }
    console.error('[accounts] create failed', err.message)
    return { error: 'Could not create the account. Please try again.' }
  }

  const displayName = `${firstName.trim()} ${lastName.trim()}`
  const roleName = roleLabel(roleCode)

  let emailResult
  try {
    if (roleCode === 'admin') {
      emailResult = await sendAdminCreatedEmail({
        to: normalizedEmail,
        userName: displayName,
        email: normalizedEmail,
        password: temporaryPassword,
        role: roleName,
      })
    } else {
      emailResult = await sendUserCreatedEmail({
        to: normalizedEmail,
        userName: displayName,
        email: normalizedEmail,
        password: temporaryPassword,
        role: roleName,
      })
    }
  } catch (err) {
    const emailError =
      err instanceof NexusConfigError || err instanceof NexusRequestError
        ? err.message
        : 'The login email could not be sent.'
    console.error('[accounts] email failed after create', {
      userId: created.userId,
      code: err.code,
    })
    const user = toPublicUser(await findUserById(created.userId))
    return {
      user,
      emailSent: false,
      emailError:
        roleCode === 'admin'
          ? 'Administrator account was created, but the login email could not be sent. Please retry the email.'
          : 'Employee account was created, but the login email could not be sent. Please retry the email.',
      detail: emailError,
    }
  }

  // Drop plaintext from memory as soon as possible (GC); never return it.
  const user = toPublicUser(await findUserById(created.userId))
  return {
    user,
    emailSent: true,
    requestId: emailResult.requestId,
  }
}

export async function resendCredentials(userId, { asRole }) {
  const row = await findUserById(userId)
  if (!row) return { error: 'Account not found.' }
  if (asRole === 'admin' && row.role !== 'admin') {
    return { error: 'This action is only valid for Administrator accounts.' }
  }
  if (asRole === 'employee' && row.role !== 'employee') {
    return { error: 'This action is only valid for Employee accounts.' }
  }

  const temporaryPassword = generateTemporaryPassword()
  const passwordHash = await hashPassword(temporaryPassword)

  await query(
    `UPDATE users
     SET password_hash = $1, must_change_password = TRUE, updated_at = NOW()
     WHERE id = $2`,
    [passwordHash, userId],
  )

  const displayName = `${row.first_name} ${row.last_name}`
  const roleName = roleLabel(row.role)

  try {
    const emailResult =
      row.role === 'admin'
        ? await sendAdminCreatedEmail({
            to: row.email,
            userName: displayName,
            email: row.email,
            password: temporaryPassword,
            role: roleName,
          })
        : await sendUserCreatedEmail({
            to: row.email,
            userName: displayName,
            email: row.email,
            password: temporaryPassword,
            role: roleName,
          })
    return { ok: true, emailSent: true, requestId: emailResult.requestId, user: toPublicUser(await findUserById(userId)) }
  } catch (err) {
    console.error('[accounts] resend email failed', { userId, code: err.code })
    return {
      ok: true,
      emailSent: false,
      emailError: 'Credentials were updated, but the login email could not be sent. Please try again.',
      user: toPublicUser(await findUserById(userId)),
    }
  }
}

export async function changePassword(userId, currentPassword, nextPassword) {
  if (!nextPassword || nextPassword.length < 8) {
    return { error: 'New password must be at least 8 characters.' }
  }
  const row = await findUserById(userId)
  if (!row) return { error: 'Account not found.' }
  const ok = await verifyPassword(currentPassword, row.password_hash)
  if (!ok) return { error: 'Current password is incorrect.' }

  const passwordHash = await hashPassword(nextPassword)
  await query(
    `UPDATE users
     SET password_hash = $1, must_change_password = FALSE, updated_at = NOW()
     WHERE id = $2`,
    [passwordHash, userId],
  )
  return { user: toPublicUser(await findUserById(userId)) }
}

export async function listUsersByRoles(roleCodes) {
  const { rows } = await query(
    `${USER_SELECT} WHERE r.code = ANY($1::text[]) ORDER BY e.first_name, e.last_name`,
    [roleCodes],
  )
  return rows.map(toPublicUser)
}

export async function listDepartments() {
  const { rows } = await query(`SELECT id, name, description FROM departments ORDER BY name`)
  return rows
}
