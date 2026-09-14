import express from 'express'
import cors from 'cors'
import { assertRuntimeConfig, env } from './config/env.js'
import { errorHandler } from './middleware/error.js'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admins.js'
import employeeRoutes from './routes/employees.js'

assertRuntimeConfig()

const app = express()
app.use(cors({ origin: env.frontendOrigin, credentials: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    tier: 'application',
    nexusConfigured: Boolean(env.nexus.apiKey),
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/admins', adminRoutes)
app.use('/api/employees', employeeRoutes)

app.use(errorHandler)

app.listen(env.port, () => {
  console.info(`Aurelia API listening on http://localhost:${env.port}`)
  console.info(`Nexus configured: ${Boolean(env.nexus.apiKey)}`)
})
