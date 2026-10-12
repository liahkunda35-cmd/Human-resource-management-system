import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPool } from '../config/db.js'
import { assertRuntimeConfig } from '../config/env.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function migrate() {
  assertRuntimeConfig()
  const dir = path.resolve(__dirname, '../../../database/migrations')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  const pool = getPool()

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const existing = await pool.query(`SELECT filename FROM schema_migrations`)
  const applied = new Set(existing.rows.map((row) => row.filename))

  if (!applied.has('001_init.sql')) {
    const roles = await pool.query(`SELECT to_regclass('public.roles') AS name`)
    if (roles.rows[0]?.name) {
      await pool.query(`INSERT INTO schema_migrations (filename) VALUES ('001_init.sql') ON CONFLICT DO NOTHING`)
      applied.add('001_init.sql')
      console.info('Migration baselined:', '001_init.sql')
    }
  }

  if (!applied.has('002_access_codes.sql')) {
    const column = await pool.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'access_code_hash'`,
    )
    if (column.rows.length) {
      await pool.query(`INSERT INTO schema_migrations (filename) VALUES ('002_access_codes.sql') ON CONFLICT DO NOTHING`)
      applied.add('002_access_codes.sql')
      console.info('Migration baselined:', '002_access_codes.sql')
    }
  }

  for (const file of files) {
    if (applied.has(file)) {
      console.info('Migration skipped:', file)
      continue
    }
    const sql = fs.readFileSync(path.join(dir, file), 'utf8')
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query(`INSERT INTO schema_migrations (filename) VALUES ($1)`, [file])
      await client.query('COMMIT')
      console.info('Migration applied:', file)
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }

  await pool.end()
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
