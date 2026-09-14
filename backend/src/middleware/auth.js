import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { findUserById, toPublicUser } from '../services/userService.js'

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  )
}

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const [scheme, token] = header.split(' ')
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Authentication required.' })
    }
    let payload
    try {
      payload = jwt.verify(token, env.jwtSecret)
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session.' })
    }
    const row = await findUserById(payload.sub)
    if (!row || row.account_status !== 'active') {
      return res.status(401).json({ error: 'Invalid or expired session.' })
    }
    req.user = toPublicUser(row)
    req.auth = payload
    return next()
  } catch (err) {
    return next(err)
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' })
    }
    return next()
  }
}

/** Block normal app use until password is changed (except change-password itself). */
export function requirePasswordChanged(req, res, next) {
  if (req.user?.mustChangePassword) {
    return res.status(403).json({
      error: 'Password change required.',
      code: 'MUST_CHANGE_PASSWORD',
    })
  }
  return next()
}
