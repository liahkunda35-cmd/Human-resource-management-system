import { Router } from 'express'
import { authenticate, requirePasswordChanged } from '../middleware/auth.js'
import { applyLeave, attachSickNote, listLeave, reviewLeave } from '../services/leaveService.js'

const router = Router()
router.use(authenticate, requirePasswordChanged)

router.get('/', async (req, res, next) => {
  try {
    res.json(await listLeave(req.user))
  } catch (err) {
    if (err?.code === 'ECONNREFUSED' || err?.code === '57P01' || err?.code === 'ENOTFOUND') {
      return res.json({ applications: [], balances: [], types: [] })
    }
    next(err)
  }
})

router.post('/applications', async (req, res, next) => {
  try {
    const result = await applyLeave(req.user, req.body || {})
    if (result.error) return res.status(result.statusCode || 400).json({ error: result.error })
    return res.status(201).json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/applications/:id/review', async (req, res, next) => {
  try {
    const { status, note } = req.body || {}
    const result = await reviewLeave(req.user, req.params.id, status, note)
    if (result.error) return res.status(result.statusCode || 400).json({ error: result.error })
    return res.json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/applications/:id/sick-note', async (req, res, next) => {
  try {
    const result = await attachSickNote(req.user, req.params.id, req.body || {})
    if (result.error) return res.status(result.statusCode || 400).json({ error: result.error })
    return res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
