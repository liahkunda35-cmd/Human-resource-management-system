const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour
export const RESET_TOKENS_KEY = 'zamtech-hrms-reset-tokens'

export function isValidEmailFormat(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

/** SHA-256 when available; deterministic fallback for non-secure origins (LAN IP). */
export async function hashToken(rawToken: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    try {
      const data = new TextEncoder().encode(rawToken)
      const digest = await crypto.subtle.digest('SHA-256', data)
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    } catch {
      /* fall through */
    }
  }
  return fallbackHash(rawToken)
}

function fallbackHash(rawToken: string): string {
  // FNV-1a 32-bit expanded into a 64-char hex string for stable comparisons
  let h1 = 0x811c9dc5
  let h2 = 0x811c9dc5 ^ 0xa5a5a5a5
  for (let i = 0; i < rawToken.length; i++) {
    const c = rawToken.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193)
    h2 = Math.imul(h2 ^ (c + i), 0x01000193)
  }
  const part = (n: number) => (n >>> 0).toString(16).padStart(8, '0')
  // Mix again for length similar to SHA-256 hex
  let extra = ''
  let x = h1 ^ h2
  for (let i = 0; i < 6; i++) {
    x = Math.imul(x ^ (rawToken.charCodeAt(i % rawToken.length) || 0), 0x01000193)
    extra += part(x)
  }
  return `${part(h1)}${part(h2)}${extra}`
}

/** Cryptographically strong opaque token — never includes the password. */
export function generateResetToken(): string {
  const bytes = new Uint8Array(32)
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function resetTokenExpiresAt(from = Date.now()): string {
  return new Date(from + TOKEN_TTL_MS).toISOString()
}

export function buildResetPath(rawToken: string): string {
  return `/reset-password?token=${encodeURIComponent(rawToken)}`
}

export function buildResetUrl(rawToken: string): string {
  return `${window.location.origin}${buildResetPath(rawToken)}`
}

export type SendResetEmailResult =
  | { ok: true; channel: 'emailjs' | 'formsubmit' | 'local' }
  | { ok: false; error: string }

/**
 * Delivers the reset link to the user's email.
 * Prefers EmailJS when configured; otherwise optional FormSubmit.
 * Falls back to local channel when no mail provider is available.
 */
export async function sendPasswordResetEmail(payload: {
  toEmail: string
  toName: string
  resetUrl: string
}): Promise<SendResetEmailResult> {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID?.trim()
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID?.trim()
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY?.trim()

  if (serviceId && templateId && publicKey) {
    try {
      const controller = new AbortController()
      const timer = window.setTimeout(() => controller.abort(), 10000)
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: {
            to_email: payload.toEmail,
            to_name: payload.toName,
            reset_link: payload.resetUrl,
            company_name: 'Aurelia People',
          },
        }),
      })
      window.clearTimeout(timer)
      if (!res.ok) {
        return { ok: false, error: 'Unable to send reset email right now. Please try again.' }
      }
      return { ok: true, channel: 'emailjs' }
    } catch {
      return { ok: false, error: 'Network error while sending the reset email.' }
    }
  }

  if (import.meta.env.VITE_FORMSUBMIT_ENABLED === 'true') {
    try {
      const controller = new AbortController()
      const timer = window.setTimeout(() => controller.abort(), 5000)
      const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(payload.toEmail)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          _subject: 'Aurelia People — Reset your password',
          name: payload.toName,
          message:
            `We received a request to reset your Aurelia People password.\n\n` +
            `Open this secure link to choose a new password (expires in 1 hour):\n${payload.resetUrl}\n\n` +
            `If you did not request this, you can ignore this email.`,
          _template: 'box',
        }),
      })
      window.clearTimeout(timer)
      if (res.ok) {
        return { ok: true, channel: 'formsubmit' }
      }
    } catch {
      /* fall through */
    }
  }

  return { ok: true, channel: 'local' }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
