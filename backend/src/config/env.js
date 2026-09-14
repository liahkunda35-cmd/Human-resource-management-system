import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') })
dotenv.config({ path: path.resolve(__dirname, '../.env') })

function required(name, fallback) {
  const value = process.env[name] ?? fallback
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  seed: {
    email: process.env.SEED_SUPER_ADMIN_EMAIL || 'superadmin@zamtech.co.zm',
    password: process.env.SEED_SUPER_ADMIN_PASSWORD || '',
    firstName: process.env.SEED_SUPER_ADMIN_FIRST_NAME || 'Super',
    lastName: process.env.SEED_SUPER_ADMIN_LAST_NAME || 'Admin',
  },
  nexus: {
    apiKey: process.env.NEXUS_API_KEY || '',
    baseUrl: (process.env.NEXUS_BASE_URL || 'https://nexuszm.com/api/v1').replace(/\/$/, ''),
    appUrl: process.env.NEXUS_APP_URL || process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  },
}

export function assertRuntimeConfig() {
  required('DATABASE_URL', env.databaseUrl)
  required('JWT_SECRET', env.jwtSecret)
}
