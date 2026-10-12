import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

export class MailConfigError extends Error {
  constructor(message) {
    super(message)
    this.name = 'MailConfigError'
    this.code = 'SMTP_NOT_CONFIGURED'
    this.status = 503
  }
}

export class MailDeliveryError extends Error {
  constructor(message) {
    super(message)
    this.name = 'MailDeliveryError'
    this.code = 'SMTP_DELIVERY_FAILED'
    this.status = 502
  }
}

export function isSmtpConfigured() {
  return Boolean(env.smtp.user && env.smtp.pass)
}

export function createSmtpTransport() {
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  })
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildEmployeeActivationMessage({ userName, employeeCode, activationUrl, expiresHours = 72 }) {
  const name = String(userName || 'there').trim()
  const code = String(employeeCode || '').trim()
  const url = String(activationUrl || '').trim()
  const hours = String(expiresHours)
  const subject = 'Activate your Aurelia People account'
  const text = [
    `Hello ${name},`,
    '',
    'Human Resources created your employee account.',
    `Employee number: ${code}`,
    '',
    `Set your password with this secure link. It expires in ${hours} hours and works only once:`,
    url,
    '',
    'If you were not expecting this message, contact Human Resources.',
  ].join('\n')
  const html = [
    `<p>Hello ${escapeHtml(name)},</p>`,
    '<p>Human Resources created your employee account.</p>',
    `<p><strong>Employee number:</strong> ${escapeHtml(code)}</p>`,
    `<p>Set your password with this secure link. It expires in ${escapeHtml(hours)} hours and works only once.</p>`,
    `<p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>`,
    '<p>If you were not expecting this message, contact Human Resources.</p>',
  ].join('')
  return { subject, text, html }
}

/**
 * Sends the employee number and a one-time activation link.
 * Never logs SMTP credentials or the activation token.
 */
export async function sendEmployeeActivationEmail(payload, options = {}) {
  if (options.configured === false || (options.configured !== true && !isSmtpConfigured())) {
    throw new MailConfigError('SMTP is not configured. Set SMTP_USER and SMTP_PASS on the application server.')
  }

  const message = buildEmployeeActivationMessage(payload)
  const transport = options.transport || createSmtpTransport()

  console.info('[mail] sending employee activation', {
    to: payload.to,
    employeeCode: payload.employeeCode,
  })

  try {
    const info = await transport.sendMail({
      from: { name: 'Aurelia People', address: env.smtp.user },
      to: payload.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    })
    console.info('[mail] employee activation sent', {
      to: payload.to,
      employeeCode: payload.employeeCode,
      messageId: info?.messageId || null,
    })
    return { messageId: info?.messageId || null }
  } catch (err) {
    console.error('[mail] employee activation failed', {
      to: payload.to,
      employeeCode: payload.employeeCode,
      code: err?.code || 'SMTP_DELIVERY_FAILED',
    })
    const failure = new MailDeliveryError('The activation email could not be sent.')
    if (err?.code) failure.code = err.code
    throw failure
  }
}
