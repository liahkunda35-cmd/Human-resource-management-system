-- Leave categories, applications, and scheduled workshops.
-- Safe to re-run. Does not delete existing leave balances or employee rows.

ALTER TABLE leave_balances
  ADD COLUMN IF NOT EXISTS compassionate INT NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS study INT NOT NULL DEFAULT 5;

CREATE TABLE IF NOT EXISTS leave_types (
  code                VARCHAR(64) PRIMARY KEY,
  balance_column      VARCHAR(32) NOT NULL,
  gender_restriction  VARCHAR(16)
                      CHECK (gender_restriction IS NULL OR gender_restriction IN ('female', 'male')),
  default_days        INT NOT NULL DEFAULT 0,
  sort_order          INT NOT NULL DEFAULT 0
);

INSERT INTO leave_types (code, balance_column, gender_restriction, default_days, sort_order) VALUES
  ('Annual Leave', 'annual', NULL, 18, 1),
  ('Sick Leave', 'sick', NULL, 10, 2),
  ('Maternity Leave', 'maternity', 'female', 60, 3),
  ('Paternity Leave', 'paternity', 'male', 10, 4),
  ('Compassionate Leave', 'compassionate', NULL, 5, 5),
  ('Study Leave', 'study', NULL, 5, 6),
  ('Emergency Leave', 'emergency', NULL, 3, 7),
  ('Unpaid Leave', 'unpaid', NULL, 5, 8)
ON CONFLICT (code) DO UPDATE SET
  balance_column = EXCLUDED.balance_column,
  gender_restriction = EXCLUDED.gender_restriction,
  default_days = EXCLUDED.default_days,
  sort_order = EXCLUDED.sort_order;

CREATE TABLE IF NOT EXISTS leave_applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type      VARCHAR(64) NOT NULL REFERENCES leave_types(code),
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  days            INT NOT NULL CHECK (days > 0),
  reason          TEXT NOT NULL,
  status          VARCHAR(40) NOT NULL DEFAULT 'Pending'
                  CHECK (status IN (
                    'Pending', 'Approved', 'Rejected', 'Requires Review', 'Documentation Required'
                  )),
  reviewed_by     UUID REFERENCES employees(id),
  reviewed_at     TIMESTAMPTZ,
  review_note     TEXT NOT NULL DEFAULT '',
  sick_note_name  TEXT,
  sick_note_data  TEXT,
  sick_note_mime  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT leave_applications_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_leave_applications_employee ON leave_applications(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_status ON leave_applications(status);

CREATE TABLE IF NOT EXISTS workshops (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(200) NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  workshop_date   DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  location        VARCHAR(200) NOT NULL DEFAULT '',
  facilitator     VARCHAR(160) NOT NULL DEFAULT '',
  department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
  category        VARCHAR(80) NOT NULL DEFAULT 'General',
  status          VARCHAR(32) NOT NULL DEFAULT 'Scheduled'
                  CHECK (status IN ('Scheduled', 'Completed', 'Cancelled')),
  notes           TEXT NOT NULL DEFAULT '',
  audience        VARCHAR(32) NOT NULL DEFAULT 'all'
                  CHECK (audience IN ('all', 'department', 'employees')),
  created_by      UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workshops_date ON workshops(workshop_date);
CREATE INDEX IF NOT EXISTS idx_workshops_status ON workshops(status);
CREATE INDEX IF NOT EXISTS idx_workshops_department ON workshops(department_id);

CREATE TABLE IF NOT EXISTS workshop_participants (
  workshop_id   UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  PRIMARY KEY (workshop_id, employee_id)
);

INSERT INTO departments (name, description) VALUES
  ('Human Resources', 'Talent, employee relations, and people services.'),
  ('Information Technology', 'Software, infrastructure, and internal systems.'),
  ('Marketing', 'Brand, campaigns, and market work.'),
  ('Finance', 'Planning, payroll, and compliance.'),
  ('Customer Service', 'Support and account care.'),
  ('Operations', 'Delivery, facilities, and day-to-day operations.'),
  ('Administration', 'Records, reception, and office administration.')
ON CONFLICT (name) DO NOTHING;

-- Access codes from public self-signup must not remain usable.
UPDATE users SET access_code_hash = NULL WHERE access_code_hash IS NOT NULL;
