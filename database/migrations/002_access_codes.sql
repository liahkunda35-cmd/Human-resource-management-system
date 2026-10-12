-- Lifetime access codes issued at self-signup (never expire).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS access_code_hash TEXT,
  ADD COLUMN IF NOT EXISTS access_code_issued_at TIMESTAMPTZ;

COMMENT ON COLUMN users.access_code_hash IS
  'Bcrypt hash of the unique access code emailed at signup. The code itself does not expire.';
