import { Router } from 'express'
import { authenticate, authorize, requirePasswordChanged } from '../middleware/auth.js'
import {
  createAccountWithEmail,
  listDepartments,
  listUsersByRoles,
  resendCredentials,
  updateEmployeeAccount,
} from '../services/userService.js'
import { completeSignupRequest } from '../services/signupRequestService.js'

const router = Router()

router.use(authenticate, requirePasswordChanged)

/** Admin (and super_admin for visibility) — list employees */
router.get('/', authorize('admin', 'super_admin', 'manager'), async (_req, res, next) => {
  try {
    const users = await listUsersByRoles(['employee'])
    res.json({ users })
  } catch (err) {
    if (err?.code === 'ECONNREFUSED' || err?.code === '57P01' || err?.code === 'ENOTFOUND') {
      return res.json({ users: [] })
    }
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

/** HR creates an employee account. Role is always employee. A hashed password and a hashed activation token are stored; the email contains the employee number and a one-time link. */
router.post('/', authorize('admin', 'super_admin', 'manager'), async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      position,
      departmentId,
      employmentType,
      gender,
      address,
      dateOfBirth,
      dateJoined,
      basicSalary,
      housingAllowance,
      transportAllowance,
      otherAllowance,
      taxRate,
      bankName,
      accountNumber,
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
      gender,
      address,
      dateOfBirth,
      dateJoined,
      basicSalary,
      housingAllowance,
      transportAllowance,
      otherAllowance,
      taxRate,
      bankName,
      accountNumber,
    })
    if (result.error) return res.status(400).json({ error: result.error })

    completeSignupRequest(email)

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

router.patch('/:id', authorize('admin', 'super_admin', 'manager'), async (req, res, next) => {
  try {
    const result = await updateEmployeeAccount(req.user, req.params.id, req.body || {})
    if (result.error) return res.status(result.statusCode || 400).json({ error: result.error })
    return res.json({ user: result.user })
  } catch (err) {
    next(err)
  }
})

router.post('/:id/deactivate', authorize('admin', 'super_admin', 'manager'), async (req, res, next) => {
  try {
    const result = await updateEmployeeAccount(req.user, req.params.id, { status: 'Inactive' })
    if (result.error) return res.status(result.statusCode || 400).json({ error: result.error })
    return res.json({ user: result.user })
  } catch (err) {
    next(err)
  }
})

router.post('/:id/resend-credentials', authorize('admin', 'super_admin'), async (req, res, next) => {
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
