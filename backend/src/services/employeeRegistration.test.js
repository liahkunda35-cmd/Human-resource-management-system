import test from 'node:test'
import assert from 'node:assert/strict'
import employeeRouter from '../routes/employees.js'
import authRouter from '../routes/auth.js'
import {
  activateWithToken,
  buildActivationUrl,
  classifyActivationRow,
  DUPLICATE_EMAIL_ERROR,
  finalizeEmployeeInvite,
  hashActivationToken,
  issueActivationToken,
  validateEmployeeRegistration,
} from './accountActivationService.js'
import {
  buildEmployeeActivationMessage,
  MailDeliveryError,
  sendEmployeeActivationEmail,
} from './mailer.js'

const RAW_TOKEN = 'a'.repeat(64)
const EMPLOYEE_CODE = 'ZTS-26042'

test('employee registration route stays behind authentication', () => {
  const names = employeeRouter.stack.map((layer) => layer.name)
  assert.ok(names.includes('authenticate'))
  assert.ok(names.includes('requirePasswordChanged'))
  const create = employeeRouter.stack.find((layer) => layer.route?.path === '/' && layer.route.methods.post)
  assert.ok(create, 'POST /api/employees is registered')
  const signup = authRouter.stack.find((layer) => layer.route?.path === '/signup' && layer.route.methods.post)
  assert.ok(signup)
  assert.equal(signup.route.stack.some((layer) => layer.name === 'authenticate'), false)
})

test('registration rejects duplicate and invalid employee details', () => {
  assert.equal(
    validateEmployeeRegistration({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@zamtech.co.zm',
      dateJoined: '2026-10-01',
      existing: { id: 'already' },
    }).error,
    DUPLICATE_EMAIL_ERROR,
  )
  assert.match(
    validateEmployeeRegistration({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'not-an-email',
      dateJoined: '2026-10-01',
      existing: null,
    }).error,
    /valid email/i,
  )
  assert.match(
    validateEmployeeRegistration({
      firstName: '',
      lastName: 'Lovelace',
      email: 'ada@zamtech.co.zm',
      dateJoined: '2026-10-01',
      existing: null,
    }).error,
    /first and last name/i,
  )
  assert.equal(
    validateEmployeeRegistration({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@zamtech.co.zm',
      dateJoined: '2026-10-01',
      existing: null,
    }).error,
    undefined,
  )
})

test('registration email includes the employee number and a one-time link', async () => {
  let sent
  const logs = []
  const result = await finalizeEmployeeInvite({
    userId: 'user-1',
    email: 'ada@zamtech.co.zm',
    userName: 'Ada Lovelace',
    employeeCode: EMPLOYEE_CODE,
    issueToken: async () => ({ rawToken: RAW_TOKEN }),
    sendEmail: async (payload) => {
      sent = payload
      return { messageId: 'msg-1' }
    },
    logger: {
      info: (...args) => logs.push(args),
      error: (...args) => logs.push(args),
    },
  })

  assert.equal(result.emailSent, true)
  assert.equal(sent.employeeCode, EMPLOYEE_CODE)
  assert.equal(sent.password, undefined)
  assert.equal(sent.activationUrl, buildActivationUrl(RAW_TOKEN, 'http://localhost:5173'))
  const message = buildEmployeeActivationMessage(sent)
  assert.match(message.text, new RegExp(EMPLOYEE_CODE))
  assert.match(message.text, /http:\/\/localhost:5173\/activate\?token=/)
  assert.doesNotMatch(message.text, /temporary password/i)
  assert.doesNotMatch(JSON.stringify(logs), new RegExp(RAW_TOKEN))
})

test('activation tokens are stored as hashes and previous links are invalidated', async () => {
  const calls = []
  const issued = await issueActivationToken('user-1', async (sql, params) => {
    calls.push({ sql, params })
    return { rows: [] }
  })
  const insert = calls.find((call) => call.sql.includes('INSERT INTO account_activation_tokens'))
  const invalidate = calls.find((call) => call.sql.includes('SET used_at'))
  assert.ok(invalidate)
  assert.equal(invalidate.params[0], 'user-1')
  assert.notEqual(insert.params[1], issued.rawToken)
  assert.equal(insert.params[1], hashActivationToken(issued.rawToken))
  assert.equal(insert.params[1].length, 64)
})

test('activation stores a password hash and rejects a second use', async () => {
  const memory = memoryActivation()
  const tooShort = await activateWithToken(RAW_TOKEN, 'short', {
    hashPassword: async (plain) => `hashed:${plain}`,
    transaction: memory.transaction,
  })
  assert.match(tooShort.error, /at least 8/)
  assert.equal(memory.passwordHash, 'original-hash')

  const first = await activateWithToken(RAW_TOKEN, 'Correct-horse-1', {
    hashPassword: async (plain) => `hashed:${plain}`,
    transaction: memory.transaction,
  })
  assert.deepEqual(first, { ok: true })
  assert.equal(memory.passwordHash, 'hashed:Correct-horse-1')
  assert.equal(memory.accountStatus, 'active')
  assert.ok(memory.usedAt)

  const second = await activateWithToken(RAW_TOKEN, 'Another-horse-2', {
    hashPassword: async (plain) => `hashed:${plain}`,
    transaction: memory.transaction,
  })
  assert.match(second.error, /already been used/i)
  assert.equal(memory.passwordHash, 'hashed:Correct-horse-1')
})

test('expired and used activation rows cannot set a password', () => {
  const future = new Date(Date.now() + 60_000).toISOString()
  const past = new Date(Date.now() - 60_000).toISOString()
  assert.equal(classifyActivationRow({ used_at: null, expires_at: future, account_status: 'invited' }), 'valid')
  assert.equal(classifyActivationRow({ used_at: past, expires_at: future, account_status: 'invited' }), 'used')
  assert.equal(classifyActivationRow({ used_at: null, expires_at: past, account_status: 'invited' }), 'expired')
  assert.equal(classifyActivationRow(null), 'invalid')
})

test('email delivery failure is logged without secrets', async () => {
  const logs = []
  const result = await finalizeEmployeeInvite({
    userId: 'user-9',
    email: 'ada@zamtech.co.zm',
    userName: 'Ada Lovelace',
    employeeCode: EMPLOYEE_CODE,
    issueToken: async () => ({ rawToken: RAW_TOKEN }),
    sendEmail: async () => {
      throw new MailDeliveryError('The activation email could not be sent.')
    },
    logger: {
      info() {},
      error: (...args) => logs.push(args),
    },
  })

  assert.equal(result.emailSent, false)
  assert.match(result.emailError, /could not be sent/i)
  const serialized = JSON.stringify(logs)
  assert.match(serialized, /SMTP_DELIVERY_FAILED/)
  assert.doesNotMatch(serialized, new RegExp(RAW_TOKEN))
  assert.doesNotMatch(serialized, /SMTP_PASS/)

  const transportLogs = []
  const originalError = console.error
  console.error = (...args) => transportLogs.push(args)
  try {
    await assert.rejects(
      () => sendEmployeeActivationEmail({
        to: 'ada@zamtech.co.zm',
        userName: 'Ada Lovelace',
        employeeCode: EMPLOYEE_CODE,
        activationUrl: buildActivationUrl(RAW_TOKEN, 'http://localhost:5173'),
      }, {
        configured: true,
        transport: {
          async sendMail() {
            const err = new Error('535 Username and Password not accepted')
            err.code = 'EAUTH'
            throw err
          },
        },
      }),
      (err) => {
        assert.equal(err.message, 'The activation email could not be sent.')
        assert.equal(err.code, 'EAUTH')
        assert.doesNotMatch(err.message, /535|Password/)
        return true
      },
    )
  } finally {
    console.error = originalError
  }
  const transportSerialized = JSON.stringify(transportLogs)
  assert.match(transportSerialized, /EAUTH/)
  assert.doesNotMatch(transportSerialized, /535/)
  assert.doesNotMatch(transportSerialized, new RegExp(RAW_TOKEN))
})

function memoryActivation() {
  const row = {
    id: 'token-row',
    user_id: 'user-1',
    used_at: null,
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    account_status: 'invited',
  }
  const state = { passwordHash: 'original-hash' }

  async function query(sql, params) {
    if (sql.includes('FROM account_activation_tokens')) {
      if (params[0] !== hashActivationToken(RAW_TOKEN)) return { rows: [] }
      return { rows: [{ ...row }] }
    }
    if (sql.includes('UPDATE users')) {
      state.passwordHash = params[0]
      row.account_status = 'active'
      return { rows: [] }
    }
    if (sql.includes('UPDATE account_activation_tokens') && sql.includes('RETURNING')) {
      if (row.used_at) return { rows: [] }
      row.used_at = new Date().toISOString()
      return { rows: [{ id: row.id }] }
    }
    return { rows: [] }
  }

  return {
    get passwordHash() {
      return state.passwordHash
    },
    get usedAt() {
      return row.used_at
    },
    get accountStatus() {
      return row.account_status
    },
    transaction: async (fn) => fn({ query }),
  }
}
