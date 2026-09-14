import { getPool, query } from '../config/db.js'
import { assertRuntimeConfig, env } from '../config/env.js'
import { hashPassword } from '../services/passwordService.js'

async function seed() {
  assertRuntimeConfig()

  if (!env.seed.password || env.seed.password.length < 10) {
    throw new Error(
      'Set SEED_SUPER_ADMIN_PASSWORD in backend/.env (min 10 characters). Do not commit this value.',
    )
  }

  await query(`
    INSERT INTO roles (code, name) VALUES
      ('super_admin', 'Super Administrator'),
      ('admin', 'Administrator'),
      ('manager', 'HR Manager'),
      ('employee', 'Employee')
    ON CONFLICT (code) DO NOTHING
  `)

  await query(`
    INSERT INTO departments (name, description)
    VALUES ('People Operations', 'Human resources and people services')
    ON CONFLICT (name) DO NOTHING
  `)

  const existing = await query(
    `SELECT u.id FROM users u WHERE LOWER(u.email) = LOWER($1)`,
    [env.seed.email],
  )
  if (existing.rows.length) {
    console.info('Super Admin already exists:', env.seed.email)
    await getPool().end()
    return
  }

  const role = await query(`SELECT id FROM roles WHERE code = 'super_admin'`)
  const dept = await query(`SELECT id FROM departments ORDER BY name LIMIT 1`)
  const passwordHash = await hashPassword(env.seed.password)

  const userRes = await query(
    `INSERT INTO users (email, password_hash, role_id, account_status, must_change_password)
     VALUES ($1, $2, $3, 'active', FALSE)
     RETURNING id`,
    [env.seed.email.toLowerCase(), passwordHash, role.rows[0].id],
  )

  await query(
    `INSERT INTO employees (
       user_id, employee_code, first_name, last_name, phone, department_id, position,
       employment_type, employment_status, avatar_hue
     ) VALUES ($1, $2, $3, $4, '', $5, 'Super Administrator', 'Full-time', 'Active', 40)`,
    [
      userRes.rows[0].id,
      'ZTS-SA001',
      env.seed.firstName,
      env.seed.lastName,
      dept.rows[0].id,
    ],
  )

  console.info('Seeded Super Admin:', env.seed.email)
  console.info('Password was taken from SEED_SUPER_ADMIN_PASSWORD (not logged).')
  await getPool().end()
}

seed().catch((err) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
