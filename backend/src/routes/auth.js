import { Router } from 'express'
import { authenticate as authUser, changePassword, findUserByEmail } from '../services/userService.js'
import { requestPasswordReset, getResetTokenStatus, resetPasswordWithToken } from '../services/passwordResetService.js'
import { activateWithToken, getActivationStatus } from '../services/accountActivationService.js'
import { authenticateDevAdmin, authenticateDevEmployee, changeDevAdminPassword, DEV_ADMIN_ID } from '../services/devAdminService.js'
import { completeSignupRequest, createSignupRequest, listSignupRequests } from '../services/signupRequestService.js'
import { sendSignupReceivedEmail } from '../services/nexusEmailService.js'
import { authenticate, authorize, signToken } from '../middleware/auth.js'

const router = Router()

function splitAckName(request) {
  return `${request.firstName} ${request.lastName}`.trim()
}

router.post('/signup', async (req, res, next) => {
  try {
    const { name, email } = req.body || {}
    const normalizedEmail = String(email || '').trim().toLowerCase()
    try {
      const existing = await findUserByEmail(normalizedEmail)
      if (existing) {
        return res.status(400).json({ error: 'An account for this email already exists. Sign in with the details emailed to you.' })
      }
    } catch {
      /* database may be offline; keep the request for HR */
    }

    const result = createSignupRequest({ name, email })
    if (result.error) return res.status(400).json({ error: result.error })

    let emailSent = false
    try {
      await sendSignupReceivedEmail({
        to: result.request.email,
        userName: splitAckName(result.request),
        email: result.request.email,
      })
      emailSent = true
    } catch {
      emailSent = false
    }

    return res.status(201).json({
      ok: true,
      emailSent,
      alreadyPending: Boolean(result.alreadyPending),
    })
  } catch (err) {
    return next(err)
  }
})

router.get('/signup-requests', authenticate, authorize('admin', 'super_admin'), (_req, res) => {
  res.json({ requests: listSignupRequests('pending') })
})

router.post('/signup-requests/:id/complete', authenticate, authorize('admin', 'super_admin'), (req, res) => {
  const row = listSignupRequests('pending').find((item) => item.id === req.params.id)
  if (row) completeSignupRequest(row.email)
  res.json({ ok: true })
})

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {}
    const identifier = String(email || '').trim()
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email and password are required.' })
    }
    let result
    let databaseUnavailable = false
    try {
      result = await authUser(identifier, password)
    } catch (err) {
      databaseUnavailable = true
      result = { error: 'The people database is not available.', code: 'database' }
      console.error('[auth] database login unavailable', err.message)
    }
    if (!result.user) {
      const devAdmin = await authenticateDevAdmin(identifier, password)
      if (devAdmin.user) result = devAdmin
      else if (devAdmin.matched) result = { error: devAdmin.error }
    }
    if (!result.user) {
      const devEmployee = await authenticateDevEmployee(identifier, password)
      if (devEmployee.user) result = devEmployee
      else if (devEmployee.matched) result = { error: devEmployee.error }
    }
    if (result.error) {
      const status = result.code === 'database' ? 503 : 401
      return res.status(status).json({ error: result.error })
    }

    const token = signToken(result.user)
    return res.json({
      token,
      user: result.user,
      mustChangePassword: result.user.mustChangePassword,
    })
  } catch (err) {
    return next(err)
  }
})

router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user })
})

router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {}
    const result = req.user.id === DEV_ADMIN_ID
      ? await changeDevAdminPassword(currentPassword, newPassword)
      : await changePassword(req.user.id, currentPassword, newPassword)
    if (result.error) return res.status(400).json({ error: result.error })
    const token = signToken(result.user)
    return res.json({ user: result.user, token })
  } catch (err) {
    return next(err)
  }
})

router.post('/logout', authenticate, (_req, res) => {
  res.json({ ok: true })
})

router.post('/forgot-password', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim()
    const result = await requestPasswordReset(email)
    return res.json(result)
  } catch (err) {
    return next(err)
  }
})

router.get('/reset-password', async (req, res, next) => {
  try {
    const token = String(req.query?.token || '')
    const status = await getResetTokenStatus(token)
    return res.json({ status })
  } catch (err) {
    return next(err)
  }
})

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body || {}
    const result = await resetPasswordWithToken(token, newPassword)
    if (result.error) return res.status(400).json({ error: result.error })
    return res.json({ ok: true })
  } catch (err) {
    return next(err)
  }
})

router.get('/activate', async (req, res, next) => {
  try {
    const token = String(req.query?.token || '')
    const status = await getActivationStatus(token)
    return res.json({ status })
  } catch (err) {
    return next(err)
  }
})

router.post('/activate', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body || {}
    const result = await activateWithToken(token, newPassword)
    if (result.error) return res.status(400).json({ error: result.error })
    return res.json({ ok: true })
  } catch (err) {
    return next(err)
  }
})

export default router
