import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { DEV_ADMIN_ID, DEV_EMPLOYEE_ID, DEV_MALE_EMPLOYEE_ID, devAdminProfile, devEmployeeProfile, devMaleEmployeeProfile, isDevAdminActive, isDevEmployeeActive, isDevMaleEmployeeActive } from '../services/devAdminService.js'
import { expireStaleInvites, findUserById, toPublicUser } from '../services/userService.js'

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, tv: Number(user.tokenVersion ?? 1) },
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
    if (payload.sub === DEV_ADMIN_ID) {
      if (!isDevAdminActive()) {
        return res.status(401).json({ error: 'Invalid or expired session.' })
      }
      req.user = devAdminProfile()
      req.auth = payload
      return next()
    }
    if (payload.sub === DEV_EMPLOYEE_ID) {
      if (!isDevEmployeeActive()) {
        return res.status(401).json({ error: 'Invalid or expired session.' })
      }
      req.user = devEmployeeProfile()
      req.auth = payload
      return next()
    }
    if (payload.sub === DEV_MALE_EMPLOYEE_ID) {
      if (!isDevMaleEmployeeActive()) {
        return res.status(401).json({ error: 'Invalid or expired session.' })
      }
      req.user = devMaleEmployeeProfile()
      req.auth = payload
      return next()
    }
    await expireStaleInvites()
    const row = await findUserById(payload.sub)
    if (!row) {
      return res.status(401).json({ error: 'Invalid or expired session.' })
    }
    const tokenVersion = Number(row.token_version ?? 1)
    if (Number(payload.tv ?? 1) !== tokenVersion) {
      return res.status(401).json({ error: 'Invalid or expired session.' })
    }
    if (row.account_status !== 'active' && row.account_status !== 'invited') {
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
