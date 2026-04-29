# ⚡ pulse

A minimal full-stack app for logging anything — ideas, notes, tasks, random thoughts.  
Built with **Go** · **Next.js** · **CloudNativePG** · deployed to Kubernetes via **ArgoCD**.

## Stack

| Layer | Tech |
|---|---|
| API | Go (stdlib `net/http`, no frameworks) |
| Frontend | Next.js 15 + Tailwind CSS |
| Database | PostgreSQL via [CloudNativePG](https://cloudnative-pg.io) |
| Deploy | ArgoCD + Kustomize |
| CI | GitHub Actions → ghcr.io |

## URLs (when deployed to the homelab)

```
https://pulse.talos-on-macos.com       frontend
https://api.pulse.talos-on-macos.com   API
```

## Run locally

```bash
# Start postgres
docker run -e POSTGRES_DB=pulse -e POSTGRES_USER=pulse \
           -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:16

# Start API
cd backend
DATABASE_URL="postgres://pulse:dev@localhost/pulse?sslmode=disable" go run ./cmd/api

# Start frontend
cd frontend
NEXT_PUBLIC_API_URL=http://localhost:8080/api npm run dev
```

## Deploy

See [the infra repo](https://github.com/omilun/Talos-on-macos) for how ArgoCD deploys this app.

Push to `main` → GitHub Actions builds both Docker images → ArgoCD detects new `latest` tag → rolling deploy.
