import pg from 'pg'
import { env } from './env.js'

const { Pool } = pg

let pool

export function getPool() {
  if (!pool) {
    if (!env.databaseUrl) {
      throw new Error('DATABASE_URL is not configured')
    }
    pool = new Pool({ connectionString: env.databaseUrl })
  }
  return pool
}

export async function query(text, params) {
  return getPool().query(text, params)
}

export async function withTransaction(fn) {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
