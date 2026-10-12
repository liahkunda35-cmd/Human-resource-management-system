import { Router } from 'express'
import { authenticate, authorize, requirePasswordChanged } from '../middleware/auth.js'
import { listDepartments } from '../services/userService.js'

const router = Router()
router.use(authenticate, requirePasswordChanged)

router.get('/', async (_req, res, next) => {
  try {
    res.json({ departments: await listDepartments() })
  } catch (err) {
    if (err?.code === 'ECONNREFUSED' || err?.code === '57P01' || err?.code === 'ENOTFOUND') {
      return res.json({ departments: [] })
    }
    next(err)
  }
})

router.post('/', authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const { query } = await import('../config/db.js')
    const name = String(req.body?.name || '').trim()
    const description = String(req.body?.description || '').trim()
    if (!name) return res.status(400).json({ error: 'Department name is required.' })
    const { rows } = await query(
      `INSERT INTO departments (name, description) VALUES ($1, $2)
       RETURNING id, name, description`,
      [name.slice(0, 120), description.slice(0, 2000)],
    )
    return res.status(201).json({ department: rows[0] })
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'A department with that name already exists.' })
    next(err)
  }
})

export default router
