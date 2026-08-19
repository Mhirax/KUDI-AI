# Local Setup Guide

Step-by-step instructions to get the backend and frontend both running on
your machine. Written for this exact repo layout — follow it in order.

Remember: this repo holds **two separate projects** in one folder —
the NestJS backend at the repo root, and the React frontend in `frontend/`.
You will run **two servers in two separate terminals**, and they talk to
each other over HTTP (never share code).

---

## 0. Prerequisites

Install these once, before anything else:

| Tool | Version | Check with |
|---|---|---|
| Node.js | 20.x or newer | `node -v` |
| npm | 10.x or newer | `npm -v` |
| Docker Desktop | any recent version | `docker -v` |
| Git | any recent version | `git -v` |

Docker Desktop must be **running** (not just installed) before step 3 —
it provides Postgres, Redis, and RabbitMQ so you don't have to install
databases directly on your machine.

---

## 1. Open the project

Open the repo root folder in your editor:

```
C:\Users\olowookere miracle\Documents\Kudi AI\Kudi AI
```

If you're using VS Code: **File → Open Folder…** → select the `Kudi AI`
folder above (the one containing `package.json`, `frontend/`, `modules/`,
`docs/`, etc.).

You'll want **two terminals open side by side** for the rest of this guide:
- **Terminal A** — stays at the repo root (`Kudi AI`) — runs the backend.
- **Terminal B** — `cd frontend` — runs the frontend.

Both can be VS Code's built-in terminal (use the `+` button to open a
second one) or two separate terminal windows.

---

## 2. Install dependencies

**Terminal A** (repo root):
```
npm install
```

**Terminal B**:
```
cd frontend
npm install
```

This installs the NestJS backend's packages at the root, and the React/Vite
frontend's packages separately inside `frontend/node_modules` — they do not
share a `node_modules` folder.

---

## 3. Configure environment variables

### 3a. Backend — `.env` at the repo root

Copy the example file and open it:
```
copy .env.example .env
```
*(PowerShell/cmd. In Git Bash use `cp .env.example .env` instead.)*

Open `.env` in your editor. The defaults work out of the box for local dev
**except** you should set real values for these two (anything non-empty is
fine for local dev — they don't need to be cryptographically strong):

```
JWT_ACCESS_SECRET=some-long-random-string
JWT_REFRESH_SECRET=a-different-long-random-string
```

Leave `DATABASE_URL`, `REDIS_*`, `RABBITMQ_URL` as their defaults for now —
they'll match the Docker containers you start in step 4.

> **Port note:** the example file assumes Postgres on the default port
> `5432`. If you already have a Postgres install on your machine using that
> port, `docker compose up` will fail to bind it. If that happens: edit
> `docker-compose.yml`'s `postgres` service to map a different host port
> (e.g. `"5433:5432"`), then update `DATABASE_URL` in `.env` to match
> (`postgresql://kudi:kudi@localhost:5433/kudi_dev?schema=public`).

### 3b. Frontend — `frontend/.env`

```
cd frontend
copy .env.example .env
```

Open `frontend/.env` — the default is correct as long as the backend runs
on port 3002 (it does by default):
```
VITE_API_BASE_URL=http://localhost:3002/api/v1
```

---

## 4. Start the infrastructure (Postgres, Redis, RabbitMQ)

**Terminal A** (repo root):
```
docker compose up -d
```

This starts three background containers: `kudi-ai-postgres-1`,
`kudi-ai-redis-1`, `kudi-ai-rabbitmq-1`. Confirm they're healthy:

```
docker ps
```

You should see all three with `Up ... (healthy)` in the STATUS column.
First run can take a minute while Docker downloads the images.

---

## 5. Set up the database

Still in **Terminal A**, generate the Prisma client and apply migrations:

```
npm run prisma:generate
npm run prisma:migrate:deploy
```

`prisma:generate` builds the typed database client the backend code
imports. `prisma:migrate:deploy` applies the SQL migration files already
committed in `infrastructure/prisma/migrations/` — it does **not** create
new migrations, so it's non-interactive and safe to run every time you set
up fresh.

(Optional) To browse the database visually:
```
npm run prisma:studio
```

---

## 6. Start the backend

**Terminal A**:
```
npm run start:web-api:watch
```

Wait for this line near the bottom of the output:
```
[Web API] listening on port 3002
```

Leave this terminal running — it auto-recompiles on file changes, but
**not** on `.env` changes (see Troubleshooting below).

Sanity check in a third terminal or browser: `http://localhost:3002/health`
should return a `200 OK`.

---

## 7. Start the frontend

**Terminal B** (inside `frontend/`):
```
npm run dev
```

Vite will print a local URL, typically:
```
➜  Local:   http://localhost:5173/
```

Open that URL in your browser. If port `5173` is already used by something
else on your machine, Vite automatically picks the next free port
(`5174`, `5175`, …) — **read the printed URL carefully**, and see the CORS
note below if you use a non-default port.

---

## 8. Try it out

1. On the splash screen, wait for it to route you to onboarding/login.
2. Click **Create account**, fill in the signup form (password just needs
   8+ characters, no other rules), and submit.
3. Log in with the account you just created.
4. You should land on `/dashboard` with a real (empty) balance loaded from
   the backend.

You're fully wired up once you see the dashboard with no error banners.

---

## Troubleshooting

**"Failed to fetch" on login/signup**
The frontend's origin isn't in the backend's CORS allowlist. Check what URL
your browser is actually on (the port Vite printed in step 7), then open
`.env` at the repo root and make sure `CORS_ORIGIN` includes that exact
`http://localhost:<port>`, comma-separated with the others, e.g.:
```
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:5175
```
Then restart the backend (see next item — `.env` changes need a restart).

**Backend doesn't pick up a `.env` change**
`nest start --watch` only recompiles on `.ts` file changes, not `.env`
changes. After editing `.env`, stop the backend (Ctrl+C in Terminal A) and
run `npm run start:web-api:watch` again. On Windows, if you get
`EADDRINUSE: address already in use :::3002` when restarting, the old
process didn't fully release the port — find and kill it:
```
netstat -ano | findstr :3002
taskkill /PID <the_pid_from_above> /F
```
then start the backend again.

**"Invalid email or password" but you're sure it's right**
Passwords are case-sensitive and there's no autofill trickery — retype it.
If you truly forgot it, there's no self-service reset flow yet; someone
with database access has to set a new password hash directly.

**Port 5432 already in use when running `docker compose up -d`**
See the port note in step 3a.

---

## Everyday quick-start (after the first-time setup above)

Once steps 1–5 are done once, every time you come back you only need:

```
# Terminal A (repo root)
docker compose up -d
npm run start:web-api:watch

# Terminal B
cd frontend
npm run dev
```

---

## Where to go next

- [`FOLDER-STRUCTURE-GUIDE.md`](FOLDER-STRUCTURE-GUIDE.md) — tour of every
  folder in the repo, what's real vs. scaffolding.
- [`CODEBASE-OVERVIEW.md`](CODEBASE-OVERVIEW.md) — stack, entry points,
  auth flow, known risks.
- [`API-CONTRACT.md`](API-CONTRACT.md) — which frontend screens map to
  which backend endpoints, and which are still pending.
