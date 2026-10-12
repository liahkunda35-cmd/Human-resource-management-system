-- Reference roles required to create employee and administrator accounts.
-- 001_init creates the table; these rows were previously inserted only by the seed script.

INSERT INTO roles (code, name) VALUES
  ('super_admin', 'Super Administrator'),
  ('admin', 'Administrator'),
  ('manager', 'HR Manager'),
  ('employee', 'Employee')
ON CONFLICT (code) DO NOTHING;

INSERT INTO departments (name, description)
VALUES ('People Operations', 'Human resources and people services.')
ON CONFLICT (name) DO NOTHING;
