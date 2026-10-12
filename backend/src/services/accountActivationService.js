import crypto from 'crypto'
import { query, withTransaction } from '../config/db.js'
import { env } from '../config/env.js'
import { hashPassword } from './passwordService.js'
import { MailConfigError, sendEmployeeActivationEmail } from './mailer.js'

export const ACTIVATION_TTL_HOURS = 72
export const ACTIVATION_TTL_MS = ACTIVATION_TTL_HOURS * 60 * 60 * 1000
export const DUPLICATE_EMAIL_ERROR = 'An account with this email already exists.'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function hashActivationToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex')
}

export function generateActivationToken() {
  return crypto.randomBytes(32).toString('hex')
}

export function activationExpiresAt(from = Date.now()) {
  return new Date(from + ACTIVATION_TTL_MS)
}

export function buildActivationUrl(rawToken, appUrl = env.appUrl) {
  const base = String(appUrl || 'http://localhost:5173').replace(/\/$/, '')
  return `${base}/activate?token=${encodeURIComponent(rawToken)}`
}

export function validateEmployeeRegistration({ firstName, lastName, email, dateJoined, existing }) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!String(firstName || '').trim() || !String(lastName || '').trim()) {
    return { error: 'First and last name are required.' }
  }
  if (!EMAIL_RE.test(normalizedEmail)) {
    return { error: 'A valid email address is required.' }
  }
  if (!dateJoined) {
    return { error: 'Start date is required.' }
  }
  if (existing) {
    return { error: DUPLICATE_EMAIL_ERROR }
  }
  return { normalizedEmail }
}

export function classifyActivationRow(row, now = Date.now()) {
  if (!row) return 'invalid'
  if (row.used_at) return 'used'
  if (new Date(row.expires_at).getTime() <= now) return 'expired'
  if (row.account_status === 'expired') return 'expired'
  if (row.account_status === 'inactive' || row.account_status === 'locked') return 'invalid'
  return 'valid'
}

function activationErrorMessage(status) {
  if (status === 'used') return 'This activation link has already been used.'
  if (status === 'expired') return 'This activation link has expired. Ask Human Resources to resend it.'
  return 'This activation link is no longer valid.'
}

export async function issueActivationToken(userId, queryFn = query) {
  const rawToken = generateActivationToken()
  const tokenHash = hashActivationToken(rawToken)
  const expiresAt = activationExpiresAt()
  await queryFn(
    `UPDATE account_activation_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  )
  await queryFn(
    `INSERT INTO account_activation_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt.toISOString()],
  )
  return { rawToken, tokenHash, expiresAt }
}

export async function finalizeEmployeeInvite({
  userId,
  email,
  userName,
  employeeCode,
  issueToken = issueActivationToken,
  sendEmail = sendEmployeeActivationEmail,
  logger = console,
}) {
  let issued
  try {
    issued = await issueToken(userId)
  } catch (err) {
    logger.error('[accounts] activation token failed', { userId, code: err.code || 'TOKEN' })
    return {
      emailSent: false,
      emailError: 'Employee account was created, but the activation link could not be prepared.',
    }
  }

  try {
    const sent = await sendEmail({
      to: email,
      userName,
      employeeCode,
      activationUrl: buildActivationUrl(issued.rawToken),
      expiresHours: ACTIVATION_TTL_HOURS,
    })
    if (typeof logger.info === 'function') {
      logger.info('[accounts] activation email sent', { userId, messageId: sent?.messageId || null })
    }
    return { emailSent: true, messageId: sent?.messageId || null }
  } catch (err) {
    logger.error('[accounts] activation email failed', { userId, code: err.code || 'MAIL' })
    const emailError = err instanceof MailConfigError
      ? 'Employee account was created. The activation email could not be sent because SMTP is not configured.'
      : 'Employee account was created. The activation email could not be sent. Use Resend activation email to try again.'
    return { emailSent: false, emailError }
  }
}

const TOKEN_SELECT = `
  SELECT t.id, t.user_id, t.used_at, t.expires_at, u.account_status
  FROM account_activation_tokens t
  JOIN users u ON u.id = t.user_id
  WHERE t.token_hash = $1
  LIMIT 1
`

export async function getActivationStatus(rawToken, queryFn = query) {
  if (!rawToken || String(rawToken).length < 32) return 'invalid'
  try {
    const { rows } = await queryFn(TOKEN_SELECT, [hashActivationToken(rawToken)])
    return classifyActivationRow(rows[0])
  } catch (err) {
    console.error('[activation] status failed', { code: err.code || 'LOOKUP' })
    return 'invalid'
  }
}

export async function activateWithToken(rawToken, newPassword, deps = {}) {
  if (!newPassword || String(newPassword).length < 8) {
    return { error: 'New password must be at least 8 characters.' }
  }
  if (!rawToken || String(rawToken).length < 32) {
    return { error: 'This activation link is no longer valid.' }
  }

  const hashFn = deps.hashPassword || hashPassword
  const transaction = deps.transaction || withTransaction

  const outcome = await transaction(async (client) => {
    const { rows } = await client.query(
      `${TOKEN_SELECT} FOR UPDATE OF t`,
      [hashActivationToken(rawToken)],
    )
    const status = classifyActivationRow(rows[0])
    if (status !== 'valid') return { error: activationErrorMessage(status) }

    const passwordHash = await hashFn(newPassword)
    await client.query(
      `UPDATE users
       SET password_hash = $1,
           must_change_password = FALSE,
           account_status = 'active',
           temp_password_expires_at = NULL,
           token_version = token_version + 1,
           updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, rows[0].user_id],
    )
    const used = await client.query(
      `UPDATE account_activation_tokens
       SET used_at = NOW()
       WHERE id = $1 AND used_at IS NULL
       RETURNING id`,
      [rows[0].id],
    )
    if (!used.rows[0]) return { error: 'This activation link is no longer valid.' }
    return { ok: true, userId: rows[0].user_id }
  })

  if (outcome?.error) return outcome
  console.info('[activation] password set', { userId: outcome.userId })
  return { ok: true }
}
