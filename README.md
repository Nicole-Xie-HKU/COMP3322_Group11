# HKUPlan — Group 11

A React, Express and MySQL course timetable planner using the supplied HKU 2026–27 snapshot.

## Run

For a ZIP submission, select `main` on GitHub and use **Code → Download ZIP**. Extract the complete archive, including hidden configuration templates, then open a terminal in the extracted folder containing this README and `package.json`. Git is not required to launch it. Avoid `%` in the extraction path: Docker Compose 5.5.1 rejects it; spaces are supported. Initial dependency/image downloads require internet access. Submit the original downloaded ZIP, not a working folder containing generated `.env` secrets.

Install Docker with Compose. From the repository root:

```sh
docker compose up -d --build
docker compose ps
```

Server: [http://c3322-pg11.cs.hku.hk](http://c3322-pg11.cs.hku.hk), accessible through HKUVPN. Docker generates persistent random secrets, initializes MySQL, imports the course workbook and starts the application. No host Node.js, npm or `.env` setup is required. Only the web port is published; MySQL stays on the Docker network.

For a fresh local installation, use the local override and open [http://localhost](http://localhost):

```sh
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

**Existing installation:** keep the existing `.env`, database passwords, database name/user and Compose project/volume identity. Existing credentials are imported into the secret volumes on first startup. Keep all three named volumes; do not use `docker compose down -v`. See [deployment](backend/docs/deployment.md).

The default web port is 80. Existing `.env` settings override defaults; set `APP_HOST=0.0.0.0`, `PORT=80` and both origin settings to the server URL when upgrading a local configuration for the school server.

## Development and checks

```sh
npm run setup                 # Install both packages from their lockfiles
npm run dev:api               # Host backend; requires separate MySQL configuration
npm run dev                   # Vite at http://localhost:5173 (use a second terminal)
npm test                      # Required backend and scheduler suites; missing suites fail
npm run test:mysql            # Creates/removes its own temporary test database
npm run test:integration      # Real HTTP tests; default http://127.0.0.1:3001
npm run build
npm run check
docker compose stop           # Stop services without deleting saved data
```

Host development commands require Node.js 24 and separately configured database access. Set `TEST_URL` for a non-default integration-test URL; adjust the Vite proxy if changing the backend port.

Docker intentionally does not publish MySQL to the host. `npm start` is the non-watch backend alternative to `npm run dev:api`.

## Unknown-time policy

Ordinary results exclude sections with any unknown meeting times. To inspect them, select **Include provisional results with unknown times**. Such results explicitly list the affected sections and are not fully conflict-verified. Unknown times are never invented. A dated class that does not meet in the displayed week remains selected; use the week arrows.

[Project map](PROJECT.md) · [Backend](backend/README.md) · [Scheduler contract](scheduler/INTERFACE.md) · [Project status](TASK_PROGRESS.md)
