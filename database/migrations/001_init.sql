-- Aurelia People — initial schema (PostgreSQL)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE roles (
  id          SMALLSERIAL PRIMARY KEY,
  code        VARCHAR(32)  NOT NULL UNIQUE,
  name        VARCHAR(64)  NOT NULL
);

CREATE TABLE departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(120) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 VARCHAR(255) NOT NULL,
  password_hash         TEXT NOT NULL,
  role_id               SMALLINT NOT NULL REFERENCES roles(id),
  account_status        VARCHAR(32) NOT NULL DEFAULT 'active'
                        CHECK (account_status IN ('active', 'inactive', 'locked')),
  must_change_password  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_account_status ON users(account_status);

CREATE TABLE employees (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  employee_code      VARCHAR(32) NOT NULL UNIQUE,
  first_name         VARCHAR(100) NOT NULL,
  last_name          VARCHAR(100) NOT NULL,
  phone              VARCHAR(40) NOT NULL DEFAULT '',
  address            TEXT NOT NULL DEFAULT '',
  department_id      UUID REFERENCES departments(id),
  position           VARCHAR(120) NOT NULL DEFAULT '',
  employment_type    VARCHAR(40) NOT NULL DEFAULT 'Full-time',
  employment_status  VARCHAR(40) NOT NULL DEFAULT 'Active',
  date_joined        DATE NOT NULL DEFAULT CURRENT_DATE,
  manager_id         UUID REFERENCES employees(id),
  gender             VARCHAR(32) NOT NULL DEFAULT 'Female',
  date_of_birth      DATE,
  avatar_hue         INT NOT NULL DEFAULT 30,
  basic_salary       NUMERIC(12,2) NOT NULL DEFAULT 0,
  housing_allowance  NUMERIC(12,2) NOT NULL DEFAULT 0,
  transport_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_allowance    NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate           NUMERIC(5,2) NOT NULL DEFAULT 0,
  bank_name          VARCHAR(120) NOT NULL DEFAULT '',
  account_number     VARCHAR(64) NOT NULL DEFAULT '',
  emergency_contact  VARCHAR(120) NOT NULL DEFAULT '',
  emergency_phone    VARCHAR(40) NOT NULL DEFAULT '',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_manager ON employees(manager_id);

CREATE TABLE leave_balances (
  employee_id UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  annual      INT NOT NULL DEFAULT 21,
  sick        INT NOT NULL DEFAULT 10,
  maternity   INT NOT NULL DEFAULT 0,
  paternity   INT NOT NULL DEFAULT 0,
  emergency   INT NOT NULL DEFAULT 5,
  unpaid      INT NOT NULL DEFAULT 0
);
