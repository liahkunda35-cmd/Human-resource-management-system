# Aurelia People

A professional Human Resource Management System for organisations that want a calm, considered people workspace — not a generic admin dashboard.

## Demo access

| Role | Email | Password |
| --- | --- | --- |
| HR Manager | `hr@zamtech.co.zm` | `Aurelia@2026` |
| IT Manager | `manager@zamtech.co.zm` | `Aurelia@2026` |
| Employee | `employee@zamtech.co.zm` | `Aurelia@2026` |

Any seeded employee can sign in with their work email and the same password.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (typically `http://localhost:5173`).

## What is included

- Role-based access for HR/Admin, Managers, and Employees
- Landing and authentication (remember me, show/hide password, forgot password)
- Dashboards, employees, departments, attendance (clock in/out), leave, payroll/payslips
- Recruitment pipeline, performance, training, documents, announcements, tasks, reports, settings
- Search, filters, export/print, notifications, toasts, and local persistence

Data lives in `localStorage` so a real API can replace the store later without rewriting the UI.
