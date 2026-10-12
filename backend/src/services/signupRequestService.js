import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STORE_PATH = path.resolve(__dirname, '../../.signup-requests.json')

function readAll() {
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(rows) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(rows, null, 2), { mode: 0o600 })
}

export function splitFullName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

export function listSignupRequests(status = 'pending') {
  return readAll()
    .filter((row) => !status || row.status === status)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}

export function createSignupRequest({ name, email }) {
  const displayName = String(name || '').trim()
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!displayName) return { error: 'Your name is required.' }
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { error: 'A valid email address is required.' }
  }

  const { firstName, lastName } = splitFullName(displayName)
  const rows = readAll()
  const existing = rows.find((row) => row.email === normalizedEmail)
  if (existing?.status === 'pending') {
    return { request: existing, alreadyPending: true }
  }
  if (existing?.status === 'completed') {
    return { error: 'An account for this email already exists. Sign in with the details emailed to you.' }
  }

  const request = {
    id: crypto.randomUUID(),
    firstName,
    lastName,
    name: displayName,
    email: normalizedEmail,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  writeAll([request, ...rows])
  return { request }
}

export function completeSignupRequest(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const rows = readAll()
  let found = false
  const next = rows.map((row) => {
    if (row.email !== normalizedEmail || row.status !== 'pending') return row
    found = true
    return { ...row, status: 'completed', completedAt: new Date().toISOString() }
  })
  if (found) writeAll(next)
  return { ok: true }
}
