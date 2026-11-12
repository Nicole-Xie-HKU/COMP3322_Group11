# Deployment

Server: http://cs3322-pg11.cs.hku.hk (HKUVPN required).

## Start

From the repository root, with Docker and Compose installed:

```sh
docker compose up -d --build
docker compose ps
docker compose exec -T app node backend/scripts/smoke.mjs
```

No host Node.js, npm, MySQL or web server is required. Bootstrap creates random credentials in persistent Docker volumes. MySQL starts, setup applies additive migrations and imports the workbook, then the app serves React and the API on port 80. MySQL has no published port. HTTP is the server guide's Option B; the application uses HTTP-compatible settings with exact allowed origins, HttpOnly cookies and rate limits.

## Existing installation

Keep the existing `.env`, database name/user/passwords and Compose project name. On the first upgrade, bootstrap uses the existing credentials. Subsequent starts reuse the secret volumes and reject conflicting supplied credentials. Keep `mysql_data`, `runtime_secrets` and `admin_secrets` together; never remove volumes to troubleshoot.

For the school server, existing `.env` settings must use `APP_HOST=0.0.0.0`, `PORT=80`, `NODE_ENV=development`, and `PUBLIC_ORIGIN` / `ALLOWED_ORIGINS` set to `http://cs3322-pg11.cs.hku.hk`. No secrets belong in Git or the submission ZIP.

Setup preserves saved schedules. Reimporting refreshes catalogue data and invalidates existing pagination cursors. Back up the database before upgrading.

```sh
docker compose stop
docker compose start mysql app
```

These stop/restart services without removing data. A fresh deployment or source update uses the start command above. Check `/api/health/ready`, course search, generation, pin/unpin and save/restore in the browser.

## Local use

```sh
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

Open http://localhost, or the `PORT` from an existing `.env`. The override permits local browser origins. Host-only development still requires Node.js 24 and separately configured MySQL access; it is not needed for deployment.
