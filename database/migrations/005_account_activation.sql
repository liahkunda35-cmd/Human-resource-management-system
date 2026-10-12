-- Employee password activation links.
-- password_reset_tokens stays reserved for forgot-password so a reset link
-- cannot activate an invited account, and an activation link cannot reset one.
-- Only the SHA-256 hash of the token is stored. The raw token exists in the email.

CREATE TABLE IF NOT EXISTS account_activation_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_activation_user ON account_activation_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_account_activation_expires ON account_activation_tokens(expires_at);
