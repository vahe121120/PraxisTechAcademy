# Praxis Tech Academy

Cohort-based IT school platform — NestJS backend, Next.js frontend, PostgreSQL.

---

## Prerequisites

| Tool | Min version |
|------|-------------|
| Docker + Docker Compose | 24+ |
| Node.js | 22+ |
| npm | 10+ |

---

## Running locally (Docker — recommended)

This is the fastest path: everything runs in containers, including Postgres.

```bash
# 1. Copy env and fill in the CHANGE_ME values (DB password, real ARCA/Telegram creds if needed)
cp .env.example .env

# 2. Build and start all services (postgres → migrate → backend → frontend)
docker compose build
docker compose up -d

# 3. Watch logs until everything is healthy
docker compose logs -f migrate backend frontend
```

After startup:
- **API** → http://localhost:3000
- **Health check** → http://localhost:3000/health/live
- **Frontend** → http://localhost:3001

> **Note:** `docker-compose.override.yml` is auto-merged and exposes the ports above.  
> The `backup` service is disabled locally (production-only profile).

### First run — seed the admin account

```bash
# Run from inside the Admin_Panel_Backend directory (or via docker exec)
cd Admin_Panel_Backend
SEED_ADMIN_EMAIL=admin@praxistech.academy \
SEED_ADMIN_PASSWORD=YourStrongPassword \
SEED_ADMIN_NAME="Praxis Admin" \
npx prisma db seed
```

---

## Running locally (native — frontend dev server)

Use this when you want hot-reload on the frontend while the backend runs in Docker.

```bash
# Start Postgres + backend in Docker
docker compose up -d postgres migrate backend

# In a second terminal — frontend with hot-reload
cd Frontend/praxis-web
npm install
npm run dev        # → http://localhost:3000 (Next.js dev server)
```

`.env.local` already sets `NEXT_PUBLIC_API_URL=http://localhost:3000` (backend).

---

## Running the backend natively (full hot-reload stack)

```bash
# Terminal 1 — Postgres only
docker compose up -d postgres

# Terminal 2 — Backend
cd Admin_Panel_Backend
npm install
npm run start:dev  # → http://localhost:3000

# Terminal 3 — Frontend
cd Frontend/praxis-web
npm install
npm run dev        # → http://localhost:3000 (Next.js)
```

Make sure `Admin_Panel_Backend/.env` exists (copy from its `.env.example` and fill in values).  
`DATABASE_URL` must point to `localhost:5432` (the Postgres port exposed by `docker-compose.override.yml`).

---

## Database — Prisma

```bash
# Apply pending migrations (run after pulling new code)
cd Admin_Panel_Backend
npx prisma migrate deploy

# Open Prisma Studio (visual DB browser)
npx prisma studio

# Create a new migration (after editing schema.prisma)
npx prisma migrate dev --name describe_your_change
```

---

## Project structure

```
.
├── Admin_Panel_Backend/   NestJS API (auth, payments, Telegram, admin)
├── Frontend/praxis-web/   Next.js 16 web app
├── ops/backup/            pg_dump backup container (production)
├── docker-compose.yml     Production service definitions
├── docker-compose.override.yml  Local dev overrides (auto-merged)
└── .env.example           Template for root docker-compose variables
```

---

## Environment variables

| File | Used by |
|------|---------|
| `.env` (root) | `docker compose` — all services |
| `Admin_Panel_Backend/.env` | Native `npm run start:dev` |
| `Frontend/praxis-web/.env.local` | Native `npm run dev` |

Copy the corresponding `.env.example` file and fill in `CHANGE_ME` values.