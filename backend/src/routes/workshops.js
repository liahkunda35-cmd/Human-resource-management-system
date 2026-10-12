import { Router } from 'express'
import { authenticate, requirePasswordChanged } from '../middleware/auth.js'
import {
  deleteWorkshop,
  getWorkshop,
  listWorkshops,
  saveWorkshop,
  setWorkshopStatus,
} from '../services/workshopService.js'

const router = Router()
router.use(authenticate, requirePasswordChanged)

router.get('/', async (req, res, next) => {
  try {
    const workshops = await listWorkshops(req.user)
    res.json({ workshops })
  } catch (err) {
    if (err?.code === 'ECONNREFUSED' || err?.code === '57P01' || err?.code === 'ENOTFOUND') {
      return res.json({ workshops: [] })
    }
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const result = await getWorkshop(req.user, req.params.id)
    if (result.error) return res.status(result.statusCode || 400).json({ error: result.error })
    return res.json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const result = await saveWorkshop(req.user, req.body || {})
    if (result.error) return res.status(result.statusCode || 400).json({ error: result.error })
    return res.status(201).json(result)
  } catch (err) {
    next(err)
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const result = await saveWorkshop(req.user, req.body || {}, req.params.id)
    if (result.error) return res.status(result.statusCode || 400).json({ error: result.error })
    return res.json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/:id/status', async (req, res, next) => {
  try {
    const result = await setWorkshopStatus(req.user, req.params.id, req.body?.status)
    if (result.error) return res.status(result.statusCode || 400).json({ error: result.error })
    return res.json(result)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await deleteWorkshop(req.user, req.params.id)
    if (result.error) return res.status(result.statusCode || 400).json({ error: result.error })
    return res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
