# HKUPlan — Group 11

A React, Express and MySQL course timetable planner using the supplied HKU 2026–27 snapshot.

## First local setup

Use **Node.js 24** and Docker Desktop with Compose. Run these commands from the repository root:

```sh
npm run setup:env
# Creates an ignored .env with random secrets; refuses to overwrite an existing file.
docker compose up -d mysql
docker compose run --build --rm setup
docker compose up --build -d app
docker compose ps
```

Open [HKUPlan](http://localhost:3001). The explicit one-off `setup` command applies additive migrations and imports the workbook. Starting `app` alone does not initialize the database. Do not simply copy the placeholder credentials from `.env.example`.

**Existing installation:** keep the existing `.env`, database passwords, database name/user and Compose project/volume identity. Back up MySQL before maintenance. Add missing settings from `.env.example`, including a random 32-or-more-character `CURSOR_SECRET`; do not regenerate credentials for an existing volume. See [deployment](backend/docs/deployment.md). Never use `docker compose down -v` to troubleshoot.

Port defaults are 3001 for the app and 3307 for loopback MySQL. If changing `PORT`, also change `PUBLIC_ORIGIN` and `ALLOWED_ORIGINS` to match the browser URL. Keep the database private.

## Development and checks

```sh
npm run setup                 # Install both packages from their lockfiles
npm run dev:api               # Host backend; requires local MySQL/setup above
npm run dev                   # Vite at http://localhost:5173 (use a second terminal)
npm test                      # Required backend and scheduler suites; missing suites fail
npm run test:mysql            # Creates/removes its own temporary test database
npm run test:integration      # Real HTTP tests; default http://127.0.0.1:3001
npm run build
npm run check
docker compose stop           # Stop services without deleting saved data
```

Do not run the host backend and Docker app on the same port. Set `TEST_URL` for a non-default integration-test URL; adjust the Vite proxy if changing the backend port.

## Unknown-time policy

Ordinary results exclude sections with any unknown meeting times. To inspect them, select **Include provisional results with unknown times**. Such results explicitly list the affected sections and are not fully conflict-verified. Unknown times are never invented. A dated class that does not meet in the displayed week remains selected; use the week arrows.

[Project map](PROJECT.md) · [Backend](backend/README.md) · [Scheduler contract](scheduler/INTERFACE.md) · [Local patch status](TASK_PROGRESS.md)
