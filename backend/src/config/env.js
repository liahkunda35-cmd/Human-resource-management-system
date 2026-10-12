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
  devAdmin: {
    enabled: process.env.DEV_ADMIN_ENABLED !== 'false',
    username: process.env.DEV_ADMIN_USERNAME || '',
    email: process.env.DEV_ADMIN_EMAIL || '',
    password: process.env.DEV_ADMIN_PASSWORD || '',
  },
  devEmployee: {
    enabled: process.env.DEV_EMPLOYEE_ENABLED !== 'false',
    username: process.env.DEV_EMPLOYEE_USERNAME || 'employee',
    email: process.env.DEV_EMPLOYEE_EMAIL || 'employee@zamtech.co.zm',
    password: process.env.DEV_EMPLOYEE_PASSWORD || '',
  },
  devMaleEmployee: {
    enabled: process.env.DEV_MALE_EMPLOYEE_ENABLED !== 'false',
    username: process.env.DEV_MALE_EMPLOYEE_USERNAME || 'male',
    email: process.env.DEV_MALE_EMPLOYEE_EMAIL || 'male@zamtech.co.zm',
    password: process.env.DEV_MALE_EMPLOYEE_PASSWORD || '',
  },
  nexus: {
    apiKey: process.env.NEXUS_API_KEY || '',
    baseUrl: (process.env.NEXUS_BASE_URL || 'https://nexuszm.com/api/v1').replace(/\/$/, ''),
    appUrl: process.env.NEXUS_APP_URL || process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT || 587) === 465,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  appUrl: (process.env.APP_URL || process.env.FRONTEND_ORIGIN || 'http://localhost:5173').replace(/\/$/, ''),
}

export function assertRuntimeConfig() {
  required('DATABASE_URL', env.databaseUrl)
  required('JWT_SECRET', env.jwtSecret)
}
