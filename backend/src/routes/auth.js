import { Router } from 'express'
import {
  authenticate as authUser,
  changePassword,
} from '../services/userService.js'
import { authenticate, signToken } from '../middleware/auth.js'

const router = Router()

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' })
    }
    const result = await authUser(email, password)
    if (result.error) return res.status(401).json({ error: result.error })

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
    const result = await changePassword(req.user.id, currentPassword, newPassword)
    if (result.error) return res.status(400).json({ error: result.error })
    const token = signToken(result.user)
    return res.json({ user: result.user, token })
  } catch (err) {
    return next(err)
  }
})

router.post('/logout', authenticate, (_req, res) => {
  // JWT is client-held; client discards token.
  res.json({ ok: true })
})

export default router
