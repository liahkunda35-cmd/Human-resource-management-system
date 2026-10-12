-- Account lifecycle: invited / expired, temp password TTL, session version, password resets.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_status_check;
ALTER TABLE users ADD CONSTRAINT users_account_status_check
  CHECK (account_status IN ('invited', 'active', 'expired', 'inactive', 'locked'));

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS temp_password_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_temp_password_expires ON users(temp_password_expires_at)
  WHERE account_status = 'invited';

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at);
