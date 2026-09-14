import { Router } from 'express'
import { authenticate, authorize, requirePasswordChanged } from '../middleware/auth.js'
import {
  createAccountWithEmail,
  listUsersByRoles,
  resendCredentials,
} from '../services/userService.js'

const router = Router()

router.use(authenticate, requirePasswordChanged)

/** Super Admin only — list Administrator accounts */
router.get('/', authorize('super_admin'), async (_req, res, next) => {
  try {
    const users = await listUsersByRoles(['admin'])
    res.json({ users })
  } catch (err) {
    next(err)
  }
})

/** Super Admin creates an Administrator and emails credentials via Nexus admin_created */
router.post('/', authorize('super_admin'), async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, position, departmentId } = req.body || {}
    const result = await createAccountWithEmail({
      actor: req.user,
      roleCode: 'admin',
      firstName,
      lastName,
      email,
      phone,
      position: position || 'Administrator',
      departmentId,
    })
    if (result.error) return res.status(400).json({ error: result.error })

    const status = result.emailSent ? 201 : 201
    return res.status(status).json({
      user: result.user,
      emailSent: result.emailSent,
      requestId: result.requestId || null,
      warning: result.emailSent ? undefined : result.emailError,
    })
  } catch (err) {
    next(err)
  }
})

router.post('/:id/resend-credentials', authorize('super_admin'), async (req, res, next) => {
  try {
    const result = await resendCredentials(req.params.id, { asRole: 'admin' })
    if (result.error) return res.status(400).json({ error: result.error })
    return res.json({
      user: result.user,
      emailSent: result.emailSent,
      requestId: result.requestId || null,
      warning: result.emailSent ? undefined : result.emailError,
    })
  } catch (err) {
    next(err)
  }
})

export default router
