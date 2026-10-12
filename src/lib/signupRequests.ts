import { isValidEmailFormat } from './passwordReset'

export const SIGNUP_REQUESTS_KEY = 'aurelia-signup-requests'

export type SignupRequest = {
  id: string
  firstName: string
  lastName: string
  name: string
  email: string
  status: 'pending' | 'completed'
  createdAt: string
}

export function splitFullName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

export function readLocalSignupRequests(): SignupRequest[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(SIGNUP_REQUESTS_KEY) || '[]') as SignupRequest[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeLocalSignupRequests(rows: SignupRequest[]) {
  localStorage.setItem(SIGNUP_REQUESTS_KEY, JSON.stringify(rows))
}

export function saveLocalSignupRequest(name: string, email: string): SignupRequest {
  const normalizedEmail = email.trim().toLowerCase()
  const { firstName, lastName } = splitFullName(name)
  const rows = readLocalSignupRequests()
  const existing = rows.find((row) => row.email === normalizedEmail && row.status === 'pending')
  if (existing) return existing
  const request: SignupRequest = {
    id: `signup-${Date.now()}`,
    firstName,
    lastName,
    name: name.trim(),
    email: normalizedEmail,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  writeLocalSignupRequests([request, ...rows.filter((row) => row.email !== normalizedEmail)])
  return request
}

export function completeLocalSignupRequest(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  writeLocalSignupRequests(
    readLocalSignupRequests().map((row) =>
      row.email === normalizedEmail && row.status === 'pending'
        ? { ...row, status: 'completed' as const }
        : row,
    ),
  )
}

export async function sendSignupAckEmail(payload: {
  toEmail: string
  toName: string
}): Promise<{ ok: true; channel: 'emailjs' | 'formsubmit' | 'local' } | { ok: false; error: string }> {
  if (!isValidEmailFormat(payload.toEmail)) {
    return { ok: false, error: 'Enter a valid email address.' }
  }
  const message =
    `Hello ${payload.toName},\n\n` +
    `We received your Aurelia People sign-up. Your login details will be emailed to ${payload.toEmail} ` +
    `after Human Resources creates your account.\n\n` +
    `If you already have login details, you can sign in now.`

  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID?.trim()
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID?.trim()
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY?.trim()

  if (serviceId && templateId && publicKey) {
    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: {
            to_email: payload.toEmail,
            to_name: payload.toName,
            message,
            company_name: 'Aurelia People',
          },
        }),
      })
      if (!res.ok) return { ok: false, error: 'Unable to send email right now. Please try again.' }
      return { ok: true, channel: 'emailjs' }
    } catch {
      return { ok: false, error: 'Network error while sending email.' }
    }
  }

  if (import.meta.env.VITE_FORMSUBMIT_ENABLED === 'true') {
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(payload.toEmail)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: 'Aurelia People — Sign-up received',
          name: payload.toName,
          message,
          _template: 'box',
        }),
      })
      if (res.ok) return { ok: true, channel: 'formsubmit' }
    } catch {
      /* fall through */
    }
  }

  return { ok: true, channel: 'local' }
}
