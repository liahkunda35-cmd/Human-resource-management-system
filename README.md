# Aurelia People

A professional Human Resource Management System for organisations that want a calm, considered people workspace — not a generic admin dashboard.

## First administrator

There is no public registration and no shared password in the application.

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `DATABASE_URL`, `JWT_SECRET`, and `SEED_SUPER_ADMIN_PASSWORD` (at least 10 characters).
3. Apply the database and create the first Super Administrator:

```bash
npm run db:migrate
npm run db:seed
```

Sign in with `SEED_SUPER_ADMIN_EMAIL` and `SEED_SUPER_ADMIN_PASSWORD`. That account can create administrators. Administrators create employee accounts and set a temporary password. Employees change that password on first sign-in.

## Run locally

```bash
npm install
npm run dev:api
npm run dev
```

Then open the URL Vite prints (typically `http://localhost:5173`). The Vite dev server proxies `/api` to the API on port 4000.

## What is included

- Role-based access for Super Admin, Administrator, HR Manager, and Employee
- Administrator-created employee accounts, with passwords stored as hashes
- Dashboards, employees, departments, attendance, leave (including gender-specific types), payroll/payslips
- Scheduled workshops, recruitment, performance, reports, and settings
- Search, filters, export/print, notifications, and toasts
