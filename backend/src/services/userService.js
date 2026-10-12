import { query, withTransaction } from '../config/db.js'
import { env } from '../config/env.js'
import { generateTemporaryPassword, hashPassword, verifyPassword } from './passwordService.js'
import { insertLeaveBalance } from './leaveService.js'
import {
  sendAdminCreatedEmail,
  sendEmployeeInviteEmail,
  NexusConfigError,
  NexusRequestError,
} from './nexusEmailService.js'
import {
  activationExpiresAt,
  DUPLICATE_EMAIL_ERROR,
  finalizeEmployeeInvite,
  validateEmployeeRegistration,
} from './accountActivationService.js'

const EMPLOYEE_CODE_LOCK = 87201001

const ROLE_LABEL = {
  super_admin: 'Super Administrator',
  admin: 'Admin / HR',
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
    e.emergency_phone,
    u.token_version,
    u.temp_password_expires_at,
    u.invited_at
  FROM users u
  JOIN roles r ON r.id = u.role_id
  JOIN employees e ON e.user_id = u.id
`

export async function findUserByEmail(email) {
  const { rows } = await query(`${USER_SELECT} WHERE LOWER(u.email) = LOWER($1) LIMIT 1`, [email.trim()])
  return rows[0] || null
}

export async function findUserByLogin(identifier) {
  const value = String(identifier || '').trim()
  if (!value) return null
  const { rows } = await query(
    `${USER_SELECT} WHERE LOWER(u.email) = LOWER($1) OR LOWER(e.employee_code) = LOWER($1) LIMIT 1`,
    [value],
  )
  return rows[0] || null
}

export async function expireStaleInvites() {
  try {
    await query(
      `UPDATE users
       SET account_status = 'expired', updated_at = NOW()
       WHERE account_status = 'invited'
         AND temp_password_expires_at IS NOT NULL
         AND temp_password_expires_at < NOW()`,
    )
  } catch (err) {
    console.error('[accounts] expire invites failed', err.message)
  }
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
    tokenVersion: Number(row.token_version ?? 1),
    tempPasswordExpiresAt: row.temp_password_expires_at || null,
  }
}

export async function authenticate(email, password) {
  await expireStaleInvites()
  const user = await findUserByLogin(email)
  if (!user) return { error: 'Those details do not match our records.', code: 'unknown' }
  if (user.account_status === 'inactive' || user.account_status === 'locked') {
    return { error: 'This account has been deactivated. Speak to Human Resources.', code: 'inactive' }
  }
  if (user.account_status === 'expired') {
    return {
      error: 'This invitation has expired. Ask Human Resources to resend the sign-in email.',
      code: 'expired',
    }
  }
  if (user.account_status !== 'active' && user.account_status !== 'invited') {
    return { error: 'Those details do not match our records.', code: 'unknown' }
  }
  const passwordOk = await verifyPassword(password, user.password_hash)
  if (!passwordOk) return { error: 'Those details do not match our records.', code: 'bad_password' }
  return { user: toPublicUser(user) }
}

async function nextEmployeeCode(client) {
  await client.query('SELECT pg_advisory_xact_lock($1)', [EMPLOYEE_CODE_LOCK])
  const year = new Date().getFullYear().toString().slice(-2)
  const { rows } = await client.query(
    `SELECT employee_code FROM employees
     WHERE employee_code ~ ('^ZTS-' || $1 || '[0-9]{3}$')
     ORDER BY employee_code DESC
     LIMIT 1`,
    [year],
  )
  const n = rows[0] ? Number(String(rows[0].employee_code).slice(-3)) + 1 : 1
  return `ZTS-${year}${String(n).padStart(3, '0')}`
}

function money(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function tempPasswordExpiresAt() {
  return activationExpiresAt().toISOString()
}

function signInUrl() {
  return `${String(env.nexus.appUrl || '').replace(/\/$/, '')}/login`
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

const GENDERS = new Set(['Female', 'Male', 'Non-binary'])
const EMPLOYMENT_TYPES = new Set(['Full-time', 'Part-time', 'Contract', 'Intern'])
const EMPLOYMENT_STATUSES = new Set(['Active', 'On Leave', 'Probation', 'Inactive'])

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''))
}

/**
 * Creates user + employee and stores a hashed password.
 * The plaintext password is never returned to the client.
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
  gender = 'Female',
  employeeCode = '',
  password = '',
  address = '',
  dateOfBirth = null,
  dateJoined = null,
  employmentStatus = 'Active',
  basicSalary = 0,
  housingAllowance = 0,
  transportAllowance = 0,
  otherAllowance = 0,
  taxRate = 0,
  bankName = '',
  accountNumber = '',
}) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (roleCode === 'employee') {
    const checked = validateEmployeeRegistration({
      firstName,
      lastName,
      email: normalizedEmail,
      dateJoined,
      existing: null,
    })
    if (checked.error) return checked
  } else if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { error: 'A valid email address is required.' }
  } else if (!firstName?.trim() || !lastName?.trim()) {
    return { error: 'First and last name are required.' }
  }
  if (!['super_admin', 'admin', 'manager', 'employee'].includes(roleCode)) {
    return { error: 'That role cannot be assigned.' }
  }
  if (roleCode === 'super_admin') {
    return { error: 'Super Administrator accounts cannot be created from the application.' }
  }
  const safeGender = GENDERS.has(gender) ? gender : 'Female'
  const safeType = EMPLOYMENT_TYPES.has(employmentType) ? employmentType : 'Full-time'
  const safeStatus = EMPLOYMENT_STATUSES.has(employmentStatus) ? employmentStatus : 'Active'
  const suppliedPassword = String(password || '')
  if (roleCode === 'admin' && suppliedPassword.length < 8) {
    return { error: 'Enter a temporary password of at least 8 characters.' }
  }
  if (roleCode !== 'employee' && suppliedPassword && suppliedPassword.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }
  const existing = await findUserByEmail(normalizedEmail)
  if (existing) return { error: DUPLICATE_EMAIL_ERROR }

  const temporaryPassword = roleCode === 'employee' ? generateTemporaryPassword() : (suppliedPassword || generateTemporaryPassword())
  const passwordHash = await hashPassword(temporaryPassword)
  const requestedCode = roleCode === 'employee' ? '' : String(employeeCode || '').trim()
  const isEmployeeInvite = roleCode === 'employee'
  const inviteExpires = isEmployeeInvite ? tempPasswordExpiresAt() : null

  let created
  try {
    created = await withTransaction(async (client) => {
      const roleId = await getRoleId(client, roleCode)
      const deptId = isUuid(departmentId) ? departmentId : await getDefaultDepartmentId(client)
      const code = requestedCode || await nextEmployeeCode(client)

      const userRes = await client.query(
        `INSERT INTO users (email, password_hash, role_id, account_status, must_change_password, temp_password_expires_at, invited_at, token_version)
         VALUES ($1, $2, $3, $4, TRUE, $5, $6, 1)
         RETURNING id`,
        [
          normalizedEmail,
          passwordHash,
          roleId,
          isEmployeeInvite ? 'invited' : 'active',
          inviteExpires,
          isEmployeeInvite ? new Date().toISOString() : null,
        ],
      )
      const userId = userRes.rows[0].id

      const empRes = await client.query(
        `INSERT INTO employees (
           user_id, employee_code, first_name, last_name, phone, address, department_id, position,
           employment_type, employment_status, date_joined, manager_id, gender, date_of_birth, avatar_hue,
           basic_salary, housing_allowance, transport_allowance, other_allowance, tax_rate, bank_name, account_number
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11::date, CURRENT_DATE),$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
         RETURNING id`,
        [
          userId,
          code,
          firstName.trim(),
          lastName.trim(),
          (phone || '').trim(),
          String(address || '').trim(),
          deptId,
          position.trim() || (roleCode === 'admin' ? 'Administrator' : 'Team Member'),
          safeType,
          isEmployeeInvite ? 'Active' : (safeStatus === 'Inactive' ? 'Active' : safeStatus),
          dateJoined || null,
          isUuid(actor?.employeeId) ? actor.employeeId : null,
          safeGender,
          dateOfBirth || null,
          Math.floor(Math.random() * 360),
          money(basicSalary),
          money(housingAllowance),
          money(transportAllowance),
          money(otherAllowance),
          money(taxRate),
          String(bankName || '').trim(),
          String(accountNumber || '').trim(),
        ],
      )

      await insertLeaveBalance(client, empRes.rows[0].id, safeGender)

      return { userId, employeeId: empRes.rows[0].id, employeeCode: code }
    })
  } catch (err) {
    if (err.code === '23505') {
      return { error: 'An account with this email or employee ID already exists.' }
    }
    console.error('[accounts] create failed', err.message)
    return { error: 'Could not create the account. Please try again.' }
  }

  const displayName = `${firstName.trim()} ${lastName.trim()}`
  const roleName = roleLabel(roleCode)

  if (roleCode === 'employee') {
    const delivery = await finalizeEmployeeInvite({
      userId: created.userId,
      email: normalizedEmail,
      userName: displayName,
      employeeCode: created.employeeCode,
    })
    const user = toPublicUser(await findUserById(created.userId))
    return {
      user,
      emailSent: delivery.emailSent,
      requestId: delivery.messageId || null,
      emailError: delivery.emailSent ? undefined : delivery.emailError,
    }
  }

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
      emailResult = await sendEmployeeInviteEmail({
        to: normalizedEmail,
        userName: displayName,
        email: normalizedEmail,
        employeeCode: created.employeeCode,
        password: temporaryPassword,
        signinUrl: signInUrl(),
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
          : 'Employee account was created. The sign-in email could not be sent. Use Resend sign-in email after Nexus is configured.',
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

  if (row.account_status === 'inactive') {
    return { error: 'This account is inactive. Restore it before sending a new sign-in email.' }
  }

  const temporaryPassword = generateTemporaryPassword()
  const passwordHash = await hashPassword(temporaryPassword)
  const inviteExpires = asRole === 'employee' ? tempPasswordExpiresAt() : null

  await query(
    `UPDATE users
     SET password_hash = $1,
         must_change_password = TRUE,
         account_status = CASE WHEN $3 THEN 'invited' ELSE account_status END,
         temp_password_expires_at = $4,
         invited_at = CASE WHEN $3 THEN NOW() ELSE invited_at END,
         token_version = token_version + 1,
         updated_at = NOW()
     WHERE id = $2`,
    [passwordHash, userId, asRole === 'employee', inviteExpires],
  )

  const displayName = `${row.first_name} ${row.last_name}`
  const roleName = roleLabel(row.role)

  if (row.role === 'employee') {
    const delivery = await finalizeEmployeeInvite({
      userId,
      email: row.email,
      userName: displayName,
      employeeCode: row.employee_code,
    })
    return {
      ok: true,
      emailSent: delivery.emailSent,
      requestId: delivery.messageId || null,
      emailError: delivery.emailSent ? undefined : delivery.emailError,
      user: toPublicUser(await findUserById(userId)),
    }
  }

  try {
    const emailResult = await sendAdminCreatedEmail({
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
  if (row.account_status === 'inactive') {
    return { error: 'This account is inactive and cannot change password.' }
  }
  const ok = await verifyPassword(currentPassword, row.password_hash)
  if (!ok) return { error: 'Current password is incorrect.' }

  const passwordHash = await hashPassword(nextPassword)
  await query(
    `UPDATE users
     SET password_hash = $1,
         must_change_password = FALSE,
         account_status = CASE WHEN account_status IN ('invited', 'expired') THEN 'active' ELSE account_status END,
         temp_password_expires_at = NULL,
         token_version = token_version + 1,
         updated_at = NOW()
     WHERE id = $2`,
    [passwordHash, userId],
  )
  return { user: toPublicUser(await findUserById(userId)) }
}

const HR_ROLES = new Set(['super_admin', 'admin', 'manager'])

export async function updateEmployeeAccount(actor, userId, patch) {
  if (!HR_ROLES.has(actor?.role)) {
    return { error: 'You do not have permission to update employee records.', statusCode: 403 }
  }
  const row = await findUserById(userId)
  if (!row) return { error: 'Employee not found.', statusCode: 404 }
  if (row.role === 'super_admin' && actor.role !== 'super_admin') {
    return { error: 'You do not have permission to update this account.', statusCode: 403 }
  }
  if (actor.role === 'manager' && row.department_id && row.department_id !== actor.departmentId && row.id !== actor.id) {
    return { error: 'You can only update people in your department.', statusCode: 403 }
  }
  if (patch?.role || patch?.roleCode) {
    return { error: 'Roles cannot be changed from the employee record.', statusCode: 403 }
  }

  const gender = patch.gender !== undefined ? patch.gender : row.gender
  if (!GENDERS.has(gender)) return { error: 'Choose a valid gender.' }
  const employmentType = patch.employmentType || row.employment_type
  if (!EMPLOYMENT_TYPES.has(employmentType)) return { error: 'Choose a valid employment type.' }
  const employmentStatus = patch.status || patch.employmentStatus || row.employment_status
  if (!EMPLOYMENT_STATUSES.has(employmentStatus)) return { error: 'Choose a valid employment status.' }

  const email = String(patch.email || row.email).trim().toLowerCase()
  if (!email.includes('@')) return { error: 'A valid email address is required.' }

  let accountStatus = row.account_status
  let bumpSessions = false
  if (employmentStatus === 'Inactive') {
    accountStatus = 'inactive'
    bumpSessions = row.account_status !== 'inactive'
  } else if (row.account_status === 'inactive') {
    accountStatus = 'active'
  }

  try {
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE users
         SET email = $1,
             account_status = $2,
             token_version = token_version + CASE WHEN $4 THEN 1 ELSE 0 END,
             updated_at = NOW()
         WHERE id = $3`,
        [email, accountStatus, userId, bumpSessions],
      )
      await client.query(
        `UPDATE employees SET
           first_name = $1,
           last_name = $2,
           phone = $3,
           address = $4,
           department_id = $5,
           position = $6,
           employment_type = $7,
           employment_status = $8,
           date_joined = COALESCE($9::date, date_joined),
           gender = $10,
           date_of_birth = $11,
           employee_code = $12,
           basic_salary = COALESCE($13, basic_salary),
           housing_allowance = COALESCE($14, housing_allowance),
           transport_allowance = COALESCE($15, transport_allowance),
           other_allowance = COALESCE($16, other_allowance),
           tax_rate = COALESCE($17, tax_rate),
           bank_name = COALESCE($18, bank_name),
           account_number = COALESCE($19, account_number),
           updated_at = NOW()
         WHERE user_id = $20`,
        [
          String(patch.firstName ?? row.first_name).trim(),
          String(patch.lastName ?? row.last_name).trim(),
          String(patch.phone ?? row.phone ?? '').trim(),
          String(patch.address ?? row.address ?? '').trim(),
          isUuid(patch.departmentId) ? patch.departmentId : row.department_id,
          String(patch.position ?? row.position ?? '').trim(),
          employmentType,
          employmentStatus,
          patch.dateJoined || null,
          gender,
          patch.dateOfBirth || row.date_of_birth,
          String(patch.employeeCode || row.employee_code).trim(),
          patch.basicSalary === undefined ? null : money(patch.basicSalary),
          patch.housingAllowance === undefined ? null : money(patch.housingAllowance),
          patch.transportAllowance === undefined ? null : money(patch.transportAllowance),
          patch.otherAllowance === undefined ? null : money(patch.otherAllowance),
          patch.taxRate === undefined ? null : money(patch.taxRate),
          patch.bankName === undefined ? null : String(patch.bankName || '').trim(),
          patch.accountNumber === undefined ? null : String(patch.accountNumber || '').trim(),
          userId,
        ],
      )
      if (gender !== row.gender) {
        const female = gender.toLowerCase() === 'female'
        const male = gender.toLowerCase() === 'male'
        await client.query(
          `UPDATE leave_balances lb
           SET maternity = CASE WHEN $2 THEN GREATEST(maternity, 60) ELSE 0 END,
               paternity = CASE WHEN $3 THEN GREATEST(paternity, 10) ELSE 0 END
           FROM employees e
           WHERE e.id = lb.employee_id AND e.user_id = $1`,
          [userId, female, male],
        )
      }
    })
  } catch (err) {
    if (err.code === '23505') return { error: 'That email or employee ID is already in use.' }
    console.error('[accounts] update failed', err.message)
    return { error: 'Could not update the employee record.' }
  }

  return { user: toPublicUser(await findUserById(userId)) }
}

export async function deactivateAccount(actor, userId) {
  return updateEmployeeAccount(actor, userId, { status: 'Inactive' })
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
