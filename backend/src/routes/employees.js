import { Router } from 'express'
import { authenticate, authorize, requirePasswordChanged } from '../middleware/auth.js'
import {
  createAccountWithEmail,
  listDepartments,
  listUsersByRoles,
  resendCredentials,
} from '../services/userService.js'

const router = Router()

router.use(authenticate, requirePasswordChanged)

/** Admin (and super_admin for visibility) — list employees */
router.get('/', authorize('admin', 'super_admin', 'manager'), async (_req, res, next) => {
  try {
    const users = await listUsersByRoles(['employee'])
    res.json({ users })
  } catch (err) {
    next(err)
  }
})

router.get('/departments', authorize('admin', 'super_admin', 'manager'), async (_req, res, next) => {
  try {
    const departments = await listDepartments()
    res.json({ departments })
  } catch (err) {
    next(err)
  }
})

/** Admin creates an Employee and emails credentials via Nexus user_created */
router.post('/', authorize('admin'), async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      position,
      departmentId,
      employmentType,
    } = req.body || {}

    const result = await createAccountWithEmail({
      actor: req.user,
      roleCode: 'employee',
      firstName,
      lastName,
      email,
      phone,
      position: position || 'Team Member',
      departmentId,
      employmentType,
    })
    if (result.error) return res.status(400).json({ error: result.error })

    return res.status(201).json({
      user: result.user,
      emailSent: result.emailSent,
      requestId: result.requestId || null,
      warning: result.emailSent ? undefined : result.emailError,
    })
  } catch (err) {
    next(err)
  }
})

router.post('/:id/resend-credentials', authorize('admin'), async (req, res, next) => {
  try {
    const result = await resendCredentials(req.params.id, { asRole: 'employee' })
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
