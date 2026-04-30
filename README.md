# Pulse

A personal productivity app with two modes:

- **Long-term** — Goals → Stories → Tasks hierarchy with Kanban and Gantt timeline
- **Daily** — Commitments (recurring habits) + one-time tasks with a weekly dashboard

## Architecture

```
┌─────────────────┐   /auth/*        ┌──────────────────┐
│                 │ ──────────────>  │  auth-service    │ :8081
│    frontend     │   /api/lt/*      │  longterm-service│ :8082
│    (Next.js)    │ ──────────────>  │  daily-service   │ :8083
│                 │   /api/daily/*   └──────────────────┘
└─────────────────┘        │
                           └── Each service has its own PostgreSQL database
```

| Service | Port | Description |
|---------|------|-------------|
| `frontend` | 3000 | Next.js 16 + Tailwind CSS, dark theme |
| `auth-service` | 8081 | JWT register/login, bcrypt passwords |
| `longterm-service` | 8082 | Goals (GOAL-NNN) → Stories (STORY-NNN) → Tasks (TASK-NNN) |
| `daily-service` | 8083 | Commitments (COMM-NNN), one-time tasks (OT-NNN), weekly view |

All services are written in **Go** (stdlib only, no frameworks) with **PostgreSQL**.

## Run locally

### Prerequisites
- Docker + Docker Compose
- Go 1.23+
- Node.js 20+

### With Docker Compose (recommended)

```bash
docker compose up
```

Open http://localhost:3000

### Individual services

```bash
# Start databases
docker compose up auth-db longterm-db daily-db -d

# Auth service
cd auth-service
DATABASE_URL="postgres://auth:dev@localhost:5433/auth?sslmode=disable" \
JWT_SECRET="dev-secret" go run ./cmd/api

# Longterm service
cd longterm-service
DATABASE_URL="postgres://longterm:dev@localhost:5434/longterm?sslmode=disable" \
JWT_SECRET="dev-secret" go run ./cmd/api

# Daily service
cd daily-service
DATABASE_URL="postgres://daily:dev@localhost:5435/daily?sslmode=disable" \
JWT_SECRET="dev-secret" go run ./cmd/api

# Frontend
cd frontend
cp .env.example .env   # edit if needed
npm install
npm run dev
```

## API

### Auth (`/auth/*`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | `{email, password, display_name}` → `{token, user}` |
| POST | `/auth/login` | `{email, password}` → `{token, user}` |
| GET | `/auth/me` | `Authorization: Bearer <token>` → `{user}` |

### Long-term (`/api/lt/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/lt/goals` | List / create goals |
| PUT/DELETE | `/api/lt/goals/:id` | Update / delete goal |
| GET/POST | `/api/lt/goals/:id/stories` | List / create stories under a goal |
| PUT/DELETE | `/api/lt/stories/:id` | Update / delete story |
| GET/POST | `/api/lt/stories/:id/tasks` | List / create tasks under a story |
| PUT/DELETE | `/api/lt/tasks/:id` | Update / delete task |
| GET | `/api/lt/timeline` | Gantt data for all goals/stories/tasks |

### Daily (`/api/daily/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/daily/commitments` | List / create commitments |
| PUT/DELETE | `/api/daily/commitments/:id` | Update / delete commitment |
| PUT | `/api/daily/entries/:id` | `{done: bool}` — check off a daily entry |
| GET/POST | `/api/daily/tasks` | List / create one-time tasks |
| PUT/DELETE | `/api/daily/tasks/:id` | Update / delete one-time task |
| GET | `/api/daily/week?date=YYYY-MM-DD` | Weekly dashboard view |

## Environment variables

### auth-service / longterm-service / daily-service
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection URI |
| `JWT_SECRET` | Shared JWT signing secret (same across all services) |
| `PORT` | Port to listen on (default: 8081/8082/8083) |

### frontend
| Variable | Description |
|----------|-------------|
| `AUTH_URL` | Auth service URL (default: `http://localhost:8081`) |
| `LONGTERM_URL` | Longterm service URL (default: `http://localhost:8082`) |
| `DAILY_URL` | Daily service URL (default: `http://localhost:8083`) |
