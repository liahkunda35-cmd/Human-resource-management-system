import { query, withTransaction } from '../config/db.js'
import { isHr } from './leaveService.js'

const STATUSES = new Set(['Scheduled', 'Completed', 'Cancelled'])
const AUDIENCES = new Set(['all', 'department', 'employees'])

function isoDate(value) {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

function isoTime(value) {
  if (!value) return ''
  const text = String(value)
  return text.slice(0, 5)
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''))
}

function mapWorkshop(row, participantIds) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    date: isoDate(row.workshop_date),
    startTime: isoTime(row.start_time),
    endTime: isoTime(row.end_time),
    location: row.location || '',
    facilitator: row.facilitator || '',
    departmentId: row.department_id,
    departmentName: row.department_name || '',
    category: row.category || 'General',
    status: row.status,
    notes: row.notes || '',
    audience: row.audience,
    participantIds,
    createdBy: row.created_by_user_id,
    createdAt: row.created_at,
  }
}

const WORKSHOP_SELECT = `
  SELECT
    w.*,
    d.name AS department_name,
    creator.user_id AS created_by_user_id
  FROM workshops w
  LEFT JOIN departments d ON d.id = w.department_id
  LEFT JOIN employees creator ON creator.id = w.created_by
`

async function participantMap(workshopIds) {
  const map = new Map()
  if (!workshopIds.length) return map
  const { rows } = await query(
    `SELECT wp.workshop_id, e.user_id
     FROM workshop_participants wp
     JOIN employees e ON e.id = wp.employee_id
     WHERE wp.workshop_id = ANY($1::uuid[])`,
    [workshopIds],
  )
  for (const row of rows) {
    const list = map.get(row.workshop_id) || []
    list.push(row.user_id)
    map.set(row.workshop_id, list)
  }
  return map
}

export async function listWorkshops(actor) {
  const params = []
  let where = ''
  if (!isHr(actor)) {
    params.push(actor.id, actor.departmentId)
    where = `
      WHERE w.audience = 'all'
         OR (w.audience = 'department' AND w.department_id = $2)
         OR (
           w.audience = 'employees'
           AND EXISTS (
             SELECT 1 FROM workshop_participants wp
             JOIN employees pe ON pe.id = wp.employee_id
             WHERE wp.workshop_id = w.id AND pe.user_id = $1
           )
         )
    `
  }
  const { rows } = await query(`${WORKSHOP_SELECT} ${where} ORDER BY w.workshop_date DESC, w.start_time`, params)
  const participants = await participantMap(rows.map((row) => row.id))
  return rows.map((row) => mapWorkshop(row, participants.get(row.id) || []))
}

function validatePayload(body) {
  const title = String(body?.title || '').trim()
  const description = String(body?.description || '').trim()
  const date = String(body?.date || '').slice(0, 10)
  const startTime = String(body?.startTime || '').slice(0, 5)
  const endTime = String(body?.endTime || '').slice(0, 5)
  const location = String(body?.location || '').trim()
  const facilitator = String(body?.facilitator || '').trim()
  const category = String(body?.category || 'General').trim() || 'General'
  const status = STATUSES.has(body?.status) ? body.status : 'Scheduled'
  const notes = String(body?.notes || '').trim()
  const audience = AUDIENCES.has(body?.audience) ? body.audience : 'all'
  const departmentId = body?.departmentId && isUuid(body.departmentId) ? body.departmentId : null
  const participantIds = Array.isArray(body?.participantIds)
    ? [...new Set(body.participantIds.map(String).filter(isUuid))]
    : []

  if (!title) return { error: 'Workshop title is required.' }
  if (title.length > 200) return { error: 'Workshop title is too long.' }
  if (!date) return { error: 'Workshop date is required.' }
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    return { error: 'Enter a start time and end time.' }
  }
  if (endTime <= startTime) return { error: 'End time must be after the start time.' }
  if (!location) return { error: 'Location is required.' }
  if (!facilitator) return { error: 'Facilitator is required.' }
  if (audience === 'department' && !departmentId) return { error: 'Choose a department for this workshop.' }
  if (audience === 'employees' && participantIds.length === 0) {
    return { error: 'Choose at least one employee for this workshop.' }
  }

  return {
    value: {
      title,
      description: description.slice(0, 4000),
      date,
      startTime,
      endTime,
      location: location.slice(0, 200),
      facilitator: facilitator.slice(0, 160),
      departmentId: audience === 'all' ? departmentId : audience === 'department' ? departmentId : departmentId,
      category: category.slice(0, 80),
      status,
      notes: notes.slice(0, 4000),
      audience,
      participantIds: audience === 'employees' ? participantIds : [],
    },
  }
}

async function replaceParticipants(client, workshopId, userIds) {
  await client.query(`DELETE FROM workshop_participants WHERE workshop_id = $1`, [workshopId])
  if (!userIds.length) return
  const { rows } = await client.query(
    `SELECT id FROM employees WHERE user_id = ANY($1::uuid[])`,
    [userIds],
  )
  if (rows.length !== userIds.length) {
    const err = new Error('One or more selected employees could not be found.')
    err.status = 400
    throw err
  }
  for (const row of rows) {
    await client.query(
      `INSERT INTO workshop_participants (workshop_id, employee_id) VALUES ($1, $2)`,
      [workshopId, row.id],
    )
  }
}

async function readWorkshop(id) {
  const { rows } = await query(`${WORKSHOP_SELECT} WHERE w.id = $1`, [id])
  if (!rows[0]) return null
  const participants = await participantMap([id])
  return mapWorkshop(rows[0], participants.get(id) || [])
}

export async function getWorkshop(actor, id) {
  const workshop = await readWorkshop(id)
  if (!workshop) return { error: 'Workshop not found.', statusCode: 404 }
  if (!isHr(actor)) {
    const visible = await listWorkshops(actor)
    if (!visible.some((item) => item.id === workshop.id)) {
      return { error: 'You do not have permission to view this workshop.', statusCode: 403 }
    }
  }
  return { workshop }
}

export async function saveWorkshop(actor, body, id) {
  if (!isHr(actor)) return { error: 'You do not have permission to manage workshops.', statusCode: 403 }
  const parsed = validatePayload(body)
  if (parsed.error) return parsed
  const value = parsed.value

  try {
    const workshopId = await withTransaction(async (client) => {
      if (id) {
        const existing = await client.query(`SELECT id FROM workshops WHERE id = $1`, [id])
        if (!existing.rows[0]) {
          const err = new Error('Workshop not found.')
          err.status = 404
          throw err
        }
        await client.query(
          `UPDATE workshops SET
             title = $1, description = $2, workshop_date = $3, start_time = $4, end_time = $5,
             location = $6, facilitator = $7, department_id = $8, category = $9, status = $10,
             notes = $11, audience = $12, updated_at = NOW()
           WHERE id = $13`,
          [
            value.title, value.description, value.date, value.startTime, value.endTime,
            value.location, value.facilitator, value.departmentId, value.category, value.status,
            value.notes, value.audience, id,
          ],
        )
        await replaceParticipants(client, id, value.participantIds)
        return id
      }

      const inserted = await client.query(
        `INSERT INTO workshops (
           title, description, workshop_date, start_time, end_time, location, facilitator,
           department_id, category, status, notes, audience, created_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING id`,
        [
          value.title, value.description, value.date, value.startTime, value.endTime,
          value.location, value.facilitator, value.departmentId, value.category, value.status,
          value.notes, value.audience, actor.employeeId,
        ],
      )
      const newId = inserted.rows[0].id
      await replaceParticipants(client, newId, value.participantIds)
      return newId
    })
    return { workshop: await readWorkshop(workshopId) }
  } catch (err) {
    if (err.status) return { error: err.message, statusCode: err.status }
    throw err
  }
}

export async function setWorkshopStatus(actor, id, status) {
  if (!isHr(actor)) return { error: 'You do not have permission to manage workshops.', statusCode: 403 }
  if (!STATUSES.has(status)) return { error: 'Choose a valid workshop status.' }
  const existing = await query(`UPDATE workshops SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id`, [status, id])
  if (!existing.rows[0]) return { error: 'Workshop not found.', statusCode: 404 }
  return { workshop: await readWorkshop(id) }
}

export async function deleteWorkshop(actor, id) {
  if (!isHr(actor)) return { error: 'You do not have permission to manage workshops.', statusCode: 403 }
  const result = await query(`DELETE FROM workshops WHERE id = $1 RETURNING id`, [id])
  if (!result.rows[0]) return { error: 'Workshop not found.', statusCode: 404 }
  return { ok: true }
}
