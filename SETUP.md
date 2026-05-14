# TTool — Setup Guide

## Prerequisites
- Node.js 20+
- Docker Desktop (for Postgres + Redis)
- npm

## 1. Start infrastructure

```bash
docker-compose up -d
```

This starts PostgreSQL on port 5432 and Redis on port 6379.

## 2. Backend setup

```bash
cd backend
cp .env.example .env
# Edit .env if needed (defaults work with docker-compose)

npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Backend runs on http://localhost:3001

## 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173

## Seed accounts

| Email | Password | Role |
|---|---|---|
| admin@example.com | admin123 | Admin |
| agent1@example.com | agent123 | Agent |
| agent2@example.com | agent123 | Agent |

## Key commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (watch mode) |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Re-seed the database |
| `npm run db:studio` | Open Prisma Studio (DB GUI) |
| `npm run build` | Production build |

## API base URL

All API routes are proxied through Vite in dev — the frontend calls `/auth`, `/tickets`, etc. and Vite forwards to `:3001`.

In production, point `FRONTEND_URL` in the backend `.env` to your deployed frontend origin.
