import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPool } from '../config/db.js'
import { assertRuntimeConfig } from '../config/env.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function migrate() {
  assertRuntimeConfig()
  const sqlPath = path.resolve(__dirname, '../../../database/migrations/001_init.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')
  const pool = getPool()
  await pool.query(sql)
  console.info('Migration applied:', sqlPath)
  await pool.end()
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
