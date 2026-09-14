# Aurelia People — Application tier setup

## Prerequisites
- Node.js 20+
- PostgreSQL 14+ (or Docker Desktop + `docker compose up -d`)

## Configure
1. Copy `backend/.env.example` → `backend/.env`
2. Set `DATABASE_URL`, `JWT_SECRET`, `SEED_SUPER_ADMIN_PASSWORD`, `NEXUS_API_KEY`
3. In the Nexus dashboard, create templates named exactly:
   - `admin_created`
   - `user_created`

## Database
```bash
# from repo root (with Postgres running)
npm run db:migrate
npm run db:seed
```

## Run API
```bash
cd backend
npm install
npm run dev
```

API listens on http://localhost:4000  
Frontend Vite proxies `/api` → this server.

## Account model
- Super Admin (seeded) → Admin Management → creates Admins → Nexus `admin_created`
- Admin → Employee Accounts → creates Employees → Nexus `user_created`
- No public sign-up
