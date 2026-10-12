import crypto from 'crypto'
import { query } from '../config/db.js'
import { env } from '../config/env.js'
import { hashPassword } from './passwordService.js'
import { findUserByEmail, findUserById, toPublicUser } from './userService.js'
import { sendPasswordResetEmail } from './nexusEmailService.js'

const RESET_TTL_MS = 60 * 60 * 1000
const GENERIC = {
  ok: true,
  message: 'If an account exists for that email, we have sent a reset link.',
}

export function hashResetToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex')
}

export function generateResetToken() {
  return crypto.randomBytes(32).toString('hex')
}

export async function requestPasswordReset(email) {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized || !normalized.includes('@')) return GENERIC

  let user
  try {
    user = await findUserByEmail(normalized)
  } catch (err) {
    console.error('[reset] lookup failed', err.message)
    return GENERIC
  }

  if (!user || user.account_status === 'inactive') return GENERIC

  const rawToken = generateResetToken()
  const tokenHash = hashResetToken(rawToken)
  const expiresAt = new Date(Date.now() + RESET_TTL_MS)

  try {
    await query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
      [user.id],
    )
    await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt.toISOString()],
    )
  } catch (err) {
    console.error('[reset] persist failed', err.message)
    return GENERIC
  }

  const resetUrl = `${env.nexus.appUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(rawToken)}`
  try {
    await sendPasswordResetEmail({
      to: user.email,
      userName: `${user.first_name} ${user.last_name}`.trim(),
      resetUrl,
    })
  } catch (err) {
    console.error('[reset] email failed', { code: err.code })
  }
  return GENERIC
}

export async function getResetTokenStatus(rawToken) {
  try {
    const tokenHash = hashResetToken(rawToken)
    const { rows } = await query(
      `SELECT t.*, u.account_status
       FROM password_reset_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = $1
       LIMIT 1`,
      [tokenHash],
    )
    const row = rows[0]
    if (!row) return 'invalid'
    if (row.used_at) return 'used'
    if (new Date(row.expires_at).getTime() <= Date.now()) return 'expired'
    if (row.account_status === 'inactive') return 'invalid'
    return 'valid'
  } catch (err) {
    console.error('[reset] status failed', err.message)
    return 'invalid'
  }
}

export async function resetPasswordWithToken(rawToken, nextPassword) {
  if (!nextPassword || nextPassword.length < 8) {
    return { error: 'New password must be at least 8 characters.' }
  }
  const tokenHash = hashResetToken(rawToken)
  const { rows } = await query(
    `SELECT t.*, u.account_status
     FROM password_reset_tokens t
     JOIN users u ON u.id = t.user_id
     WHERE t.token_hash = $1
     LIMIT 1`,
    [tokenHash],
  )
  const row = rows[0]
  if (!row || row.used_at || new Date(row.expires_at).getTime() <= Date.now() || row.account_status === 'inactive') {
    return { error: 'This reset link is no longer valid.' }
  }

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
    [passwordHash, row.user_id],
  )
  await query(
    `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
    [row.id],
  )
  return { user: toPublicUser(await findUserById(row.user_id)) }
}
