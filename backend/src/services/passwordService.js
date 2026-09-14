import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const BCRYPT_ROUNDS = 12

export function generateTemporaryPassword(length = 14) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  const bytes = crypto.randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length]
  }
  // Ensure complexity classes
  if (!/[A-Z]/.test(out)) out = `A${out.slice(1)}`
  if (!/[a-z]/.test(out)) out = `${out.slice(0, 1)}a${out.slice(2)}`
  if (!/[0-9]/.test(out)) out = `${out.slice(0, 2)}4${out.slice(3)}`
  if (!/[!@#$%]/.test(out)) out = `${out.slice(0, 3)}!${out.slice(4)}`
  return out
}

export async function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash)
}
