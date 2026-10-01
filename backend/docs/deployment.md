# Docker and deployment

[Home](../README.md) · [Database handoff](database-handoff.md)

## Local development

Use Node 24 for host commands. `npm run setup:env` creates random secrets with mode 0600 and refuses to overwrite an existing .env. For an existing main installation, keep database passwords, DB_NAME, DB_USER and Compose project/volume identity unchanged; add a random CURSOR_SECRET and the origins/administrator variables from .env.example. Never reuse the old backend-v2 volume with this main-compatible schema.

```sh
docker compose up -d mysql
docker compose run --build --rm setup
docker compose up --build -d app
docker compose ps
```

Open http://localhost:3001. `app` contains the existing React production build and bounded Express service; `mysql` persists data in mysql_data. The one-off setup service alone receives admin credentials. The application runtime account is restricted to SELECT/INSERT/UPDATE/DELETE after setup. Back up existing MySQL before maintenance.

If ports collide, set DB_PORT and PORT in .env. Set PUBLIC_ORIGIN/ALLOWED_ORIGINS to the corresponding browser origins too. HOST defaults to loopback for host development; Docker binds internally to 0.0.0.0 but publishes localhost by default. Vite proxy target must match a changed backend port.

Stop with `docker compose stop`. Never use `down -v` as setup, upgrade or troubleshooting. Restarting app does not rerun the importer or change catalogue revision. Source updates use an explicit maintenance run.

## Course Linux VM (pending ITS details)

Install Docker/Compose, clone the exact tested commit, configure ignored secrets, back up any existing database, run setup and start services. Set NODE_ENV=production and exact HTTPS PUBLIC_ORIGIN/ALLOWED_ORIGINS, put the app behind a TLS reverse proxy, and set TRUST_PROXY=1 only for one trusted proxy. Add TRUST_PROXY to the app service environment if using that topology. Do not publicly expose MySQL.

Production refuses HTTP origins and sets Secure cookies. Local Compose deliberately defaults to development mode because localhost is HTTP; it still runs a production-built frontend. Inspect `/api/health/live` and `/api/health/ready`, test saves after restart and browser printing, and record the final public URL in README. Local containers do not establish public production readiness.

Schemas are checksum-versioned. Future changes require a new migration, not editing an applied SQL file. DDL cannot be rolled back as part of an import transaction.
