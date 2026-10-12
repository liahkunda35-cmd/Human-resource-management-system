import { env } from '../config/env.js'

export class NexusConfigError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NexusConfigError'
    this.status = 503
    this.code = 'NEXUS_NOT_CONFIGURED'
  }
}

export class NexusRequestError extends Error {
  constructor(message, status = 502) {
    super(message)
    this.name = 'NexusRequestError'
    this.status = status
    this.code = 'NEXUS_REQUEST_FAILED'
  }
}

function assertNexusConfigured() {
  if (!env.nexus.apiKey) {
    throw new NexusConfigError(
      'Nexus email is not configured. Set NEXUS_API_KEY on the application server.',
    )
  }
  if (!env.nexus.baseUrl) {
    throw new NexusConfigError(
      'Nexus email is not configured. Set NEXUS_BASE_URL on the application server.',
    )
  }
}

/**
 * Send a templated email through Nexus Notification API.
 * HTTP 202 means queued — not proof of inbox delivery.
 * Never logs API keys or temporary passwords.
 */
export async function sendNexusNotification({ template, to, data }) {
  assertNexusConfigured()

  const url = `${env.nexus.baseUrl}/notifications`
  const payload = {
    template,
    to,
    data: Object.fromEntries(
      Object.entries(data || {}).map(([k, v]) => [k, v == null ? '' : String(v)]),
    ),
  }

  console.info('[nexus] queueing notification', {
    template,
    to,
    dataKeys: Object.keys(payload.data),
  })

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.nexus.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error('[nexus] network error', err.message)
    throw new NexusRequestError('Unable to reach the Nexus notification service.')
  }

  let body = null
  try {
    body = await response.json()
  } catch {
    body = null
  }

  if (response.status === 202) {
    const requestId = body?.request_id ?? null
    console.info('[nexus] queued', { template, to, requestId, status: body?.status })
    return {
      queued: true,
      requestId,
      status: body?.status || 'queued',
    }
  }

  const message =
    body?.error ||
    body?.message ||
    `Nexus rejected the notification (HTTP ${response.status}).`

  console.error('[nexus] rejected', { template, to, status: response.status, error: message })
  throw new NexusRequestError(message, response.status >= 400 && response.status < 600 ? response.status : 502)
}

export async function sendAdminCreatedEmail({ to, userName, email, password, role }) {
  return sendNexusNotification({
    template: 'admin_created',
    to,
    data: {
      user_name: userName,
      email,
      password,
      role,
    },
  })
}

export async function sendUserCreatedEmail({ to, userName, email, password, role }) {
  return sendNexusNotification({
    template: 'user_created',
    to,
    data: {
      user_name: userName,
      email,
      password,
      role,
    },
  })
}

export async function sendEmployeeInviteEmail({ to, userName, email, employeeCode, password, signinUrl }) {
  const data = {
    user_name: userName,
    email,
    employee_id: employeeCode,
    employee_code: employeeCode,
    password,
    signin_url: signinUrl,
    expires_hours: '72',
    role: 'Employee',
  }
  try {
    return await sendNexusNotification({
      template: 'employee_invited',
      to,
      data,
    })
  } catch (err) {
    if (err instanceof NexusConfigError) throw err
    return sendNexusNotification({
      template: 'user_created',
      to,
      data,
    })
  }
}

export async function sendPasswordResetEmail({ to, userName, resetUrl }) {
  const data = {
    user_name: userName,
    reset_url: resetUrl,
    expires_hours: '1',
  }
  try {
    return await sendNexusNotification({
      template: 'password_reset',
      to,
      data,
    })
  } catch (err) {
    if (err instanceof NexusConfigError) throw err
    return sendNexusNotification({
      template: 'user_created',
      to,
      data: {
        user_name: userName,
        email: to,
        password: '',
        role: 'Employee',
        reset_url: resetUrl,
      },
    })
  }
}

export async function sendSignupReceivedEmail({ to, userName, email }) {
  try {
    return await sendNexusNotification({
      template: 'signup_received',
      to,
      data: {
        user_name: userName,
        email,
        app_url: env.nexus.appUrl,
      },
    })
  } catch (err) {
    if (err instanceof NexusConfigError) throw err
    return sendNexusNotification({
      template: 'user_created',
      to,
      data: {
        user_name: userName,
        email,
        password: '',
        role: 'Employee',
      },
    })
  }
}

